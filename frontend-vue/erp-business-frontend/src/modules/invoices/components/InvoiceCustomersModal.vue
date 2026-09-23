<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAuthStore } from '@/modules/auth/auth.store';
import { useCustomerStore } from '@/modules/customers/interfaces/customer.store';
import type { Customer, CustomerFormData } from '@/modules/customers/interfaces/customer.interface';
import CustomerForm from '@/modules/customers/components/CustomerForm.vue';

interface Props {
  show: boolean;
  selectedCustomerId?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select-customer', customer: Customer): void;
}>();

const authStore = useAuthStore();
const customerStore = useCustomerStore();

const isSuperAdmin = computed(() => authStore.user?.rolId === 1);
const canManageCustomers = computed(
  () =>
    isSuperAdmin.value ||
    authStore.hasPermission('customers') ||
    authStore.hasPermission('customers.view'),
);

const mode = ref<'LIST' | 'CREATE' | 'EDIT'>('LIST');
const searchTerm = ref<string>('');
const activeCustomerIndex = ref<number>(-1);
const editingCustomerId = ref<string | null>(null);
const editingCustomerName = ref<string>('');

const emptyCustomer: CustomerFormData = {
  documentType: 'V',
  documentNumber: '',
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  creditLimit: 0,
  paymentTermsDays: 0,
  notes: '',
  isSpecialTaxpayer: false,
};

const customerToEdit = ref<CustomerFormData>({ ...emptyCustomer });

function normalizeText(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

watch(
  () => props.show,
  (val) => {
    if (val) {
      mode.value = 'LIST';
      searchTerm.value = '';
      activeCustomerIndex.value = -1;
      editingCustomerId.value = null;
      if (customerStore.customerList.length === 0) {
        customerStore.fetchCustomers();
      }
    }
  },
);

watch(searchTerm, () => {
  activeCustomerIndex.value = -1;
});

const filteredCustomers = computed(() => {
  const rawTerm = searchTerm.value.trim();
  if (!rawTerm) return customerStore.customerList.slice(0, 50);

  const searchTokens = normalizeText(rawTerm).split(/\s+/).filter(Boolean);

  return customerStore.customerList
    .filter((c) => {
      const pName = normalizeText(`${c.firstName} ${c.lastName}`);
      const pDoc = normalizeText(`${c.documentType} ${c.documentNumber} ${c.documentType}-${c.documentNumber}`);
      const pPhone = normalizeText(c.phone);
      const pEmail = normalizeText(c.email);
      const combined = `${pName} ${pDoc} ${pPhone} ${pEmail}`;

      return searchTokens.every((token) => combined.includes(token));
    })
    .slice(0, 50);
});

function handleSelect(customer: Customer): void {
  emit('select-customer', customer);
  emit('close');
}

function navigateSearch(direction: number): void {
  if (filteredCustomers.value.length === 0) return;
  let next = activeCustomerIndex.value + direction;
  if (next < 0) next = filteredCustomers.value.length - 1;
  if (next >= filteredCustomers.value.length) next = 0;
  activeCustomerIndex.value = next;
}

function handleSearchEnter(): void {
  if (filteredCustomers.value.length === 0) return;

  if (activeCustomerIndex.value >= 0 && activeCustomerIndex.value < filteredCustomers.value.length) {
    const item = filteredCustomers.value[activeCustomerIndex.value];
    if (item) {
      handleSelect(item);
      return;
    }
  }

  const first = filteredCustomers.value[0];
  if (first) {
    handleSelect(first);
  }
}

function startCreate(): void {
  customerToEdit.value = { ...emptyCustomer };
  mode.value = 'CREATE';
}

function startEdit(c: Customer): void {
  editingCustomerId.value = c.id;
  editingCustomerName.value = `${c.firstName} ${c.lastName}`;
  customerToEdit.value = {
    documentType: c.documentType,
    documentNumber: c.documentNumber,
    firstName: c.firstName,
    lastName: c.lastName,
    phone: c.phone || '',
    email: c.email || '',
    creditLimit: c.creditLimit || 0,
    paymentTermsDays: c.paymentTermsDays || 0,
    notes: c.notes || '',
    isSpecialTaxpayer: c.isSpecialTaxpayer || false,
  };
  mode.value = 'EDIT';
}

async function handleCreateCustomer(data: CustomerFormData): Promise<void> {
  try {
    const newCustomer = await customerStore.addCustomer(data);
    emit('select-customer', newCustomer);
    emit('close');
  } catch {
    // Error administrado y mostrado en el componente CustomerForm
  }
}

async function handleUpdateCustomer(data: CustomerFormData): Promise<void> {
  if (!editingCustomerId.value) return;
  try {
    await customerStore.updateCustomer(editingCustomerId.value, data);
    mode.value = 'LIST';
  } catch {
    // Error administrado y mostrado en el componente CustomerForm
  }
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-[#0f2942] to-navy text-white">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-white/10 text-cyan-300 flex items-center justify-center text-xl shadow-inner border border-white/10">
            👥
          </div>
          <div>
            <h3 class="text-base font-bold text-white tracking-wide">
              <span v-if="mode === 'LIST'">Directorio de Clientes [F4]</span>
              <span v-else-if="mode === 'CREATE'">Registrar Nuevo Cliente</span>
              <span v-else>Editar Cliente: {{ editingCustomerName }}</span>
            </h3>
            <p class="text-xs text-slate-300">
              <span v-if="mode === 'LIST'">Haz doble clic sobre cualquier cliente para cargarlo de inmediato</span>
              <span v-else-if="mode === 'CREATE'">Ingrese los datos del cliente para crearlo y asignarlo de inmediato</span>
              <span v-else>Actualice los datos de contacto o fiscales del cliente</span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Botón de acción según modo -->
          <button
            v-if="mode === 'LIST' && canManageCustomers"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 transition active:scale-95 cursor-pointer"
            @click="startCreate"
          >
            <span>+</span>
            <span>Nuevo Cliente</span>
          </button>

          <button
            v-else-if="mode !== 'LIST'"
            type="button"
            class="inline-flex items-center gap-1 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition cursor-pointer"
            @click="mode = 'LIST'"
          >
            ← Volver a la lista
          </button>

          <button
            type="button"
            class="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer ml-2"
            @click="emit('close')"
          >
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <!-- VISTA 1: FORMULARIO DE CREACIÓN O EDICIÓN -->
      <div v-if="mode === 'CREATE' || mode === 'EDIT'" class="flex-1 overflow-y-auto p-6">
        <CustomerForm
          :initial-data="customerToEdit"
          :submit-label="mode === 'CREATE' ? 'Guardar y Asignar a Factura' : 'Actualizar Cliente'"
          :is-saving="customerStore.isSaving"
          :error-message="customerStore.saveError"
          @submit="mode === 'CREATE' ? handleCreateCustomer($event) : handleUpdateCustomer($event)"
          @cancel="mode = 'LIST'"
        />
      </div>

      <!-- VISTA 2: LISTADO DE CLIENTES CON BÚSQUEDA -->
      <template v-else>
        <!-- Search bar -->
        <div class="p-3.5 bg-slate-50 border-b border-slate-200">
          <div class="relative">
            <input
              v-model="searchTerm"
              type="text"
              autocomplete="off"
              placeholder="🔍 Buscar por Cédula, RIF, Nombre, Teléfono o Correo... (Enter para asignar primer resultado)"
              class="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 pl-10 text-xs font-medium shadow-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              @keydown.enter.prevent="handleSearchEnter"
              @keydown.down.prevent="navigateSearch(1)"
              @keydown.up.prevent="navigateSearch(-1)"
              @keydown.esc="emit('close')"
            />
            <svg
              class="absolute left-3.5 top-3 h-4 w-4 text-slate-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <!-- Customers table -->
        <div class="flex-1 overflow-y-auto p-3 min-h-[350px]">
          <div v-if="filteredCustomers.length === 0" class="text-center py-16 text-slate-500">
            <span class="text-4xl block mb-2">🔍</span>
            <p class="text-sm font-semibold">No se encontraron clientes</p>
            <p class="text-xs text-slate-400 mt-1">Verifique el término o registre un nuevo cliente con el botón superior</p>
          </div>

          <table v-else class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-slate-200 bg-slate-100/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th class="px-4 py-2.5">Documento / RIF</th>
                <th class="px-4 py-2.5">Cliente / Razón Social</th>
                <th class="px-4 py-2.5">Teléfono</th>
                <th class="px-4 py-2.5">Correo</th>
                <th class="px-4 py-2.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              <tr
                v-for="(c, idx) in filteredCustomers"
                :key="c.id"
                :class="[
                  'transition duration-150 cursor-pointer select-none',
                  String(props.selectedCustomerId) === String(c.id)
                    ? 'bg-emerald-50/90 font-bold border-l-4 border-emerald-600'
                    : idx === activeCustomerIndex
                    ? 'bg-blue-50/80 border-l-4 border-brand'
                    : 'hover:bg-slate-50'
                ]"
                title="Doble clic para asignar directamente a la factura"
                @dblclick="handleSelect(c)"
              >
                <!-- Document -->
                <td class="px-4 py-3 font-mono text-xs font-bold text-slate-700 whitespace-nowrap">
                  {{ c.documentType }}-{{ c.documentNumber }}
                </td>

                <!-- Name & special taxpayer badge -->
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <p class="font-bold text-slate-800">{{ c.firstName }} {{ c.lastName }}</p>
                    <span v-if="c.isSpecialTaxpayer" class="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                      Especial
                    </span>
                  </div>
                </td>

                <!-- Phone -->
                <td class="px-4 py-3 text-xs text-slate-600">
                  {{ c.phone || '—' }}
                </td>

                <!-- Email -->
                <td class="px-4 py-3 text-xs text-slate-500 truncate max-w-xs">
                  {{ c.email || '—' }}
                </td>

                <!-- Actions -->
                <td class="px-4 py-3 text-center">
                  <div class="flex items-center justify-center gap-2">
                    <!-- Botón Editar -->
                    <button
                      v-if="canManageCustomers"
                      type="button"
                      class="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-brand transition cursor-pointer shadow-2xs"
                      title="Modificar datos del cliente"
                      @click.stop="startEdit(c)"
                    >
                      ✏️ Editar
                    </button>

                    <!-- Botón Asignar -->
                    <button
                      type="button"
                      :class="[
                        'inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs',
                        String(props.selectedCustomerId) === String(c.id)
                          ? 'bg-emerald-700 text-white'
                          : 'bg-navy hover:bg-navy-light text-white'
                      ]"
                      @click.stop="handleSelect(c)"
                    >
                      {{ String(props.selectedCustomerId) === String(c.id) ? '✓ Asignado' : 'Asignar' }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Mostrando <strong>{{ filteredCustomers.length }}</strong> clientes (💡 <em>Haz <strong>doble clic</strong> en cualquier fila para asignarlo de inmediato</em>)
          </span>
          <button
            type="button"
            class="rounded-xl border border-slate-300 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-100 transition cursor-pointer"
            @click="emit('close')"
          >
            Cerrar
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
