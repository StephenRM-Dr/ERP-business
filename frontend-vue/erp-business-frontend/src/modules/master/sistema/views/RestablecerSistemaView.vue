<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '@/api/axios-client';
import { useAuthStore } from '@/modules/auth/auth.store';

const router = useRouter();
const authStore = useAuthStore();

const modoSeleccionado = ref<'OPERACIONES' | 'FABRICA'>('OPERACIONES');
const showModalConfirmacion = ref(false);
const confirmacionTexto = ref('');
const isLoading = ref(false);
const mensajeExito = ref<string | null>(null);
const mensajeError = ref<string | null>(null);

function abrirModal() {
  confirmacionTexto.value = '';
  mensajeError.value = null;
  mensajeExito.value = null;
  showModalConfirmacion.value = true;
}

function cerrarModal() {
  if (isLoading.value) return;
  showModalConfirmacion.value = false;
  confirmacionTexto.value = '';
}

async function ejecutarRestablecimiento() {
  if (confirmacionTexto.value.trim().toUpperCase() !== 'RESTABLECER') {
    mensajeError.value = 'Debe escribir exactamente la palabra RESTABLECER';
    return;
  }

  isLoading.value = true;
  mensajeError.value = null;

  try {
    const { data } = await apiClient.post('/sistema/restablecer', {
      tipo: modoSeleccionado.value,
      confirmacion: confirmacionTexto.value.trim().toUpperCase(),
    });

    mensajeExito.value = data.mensaje || 'Sistema restablecido exitosamente.';
    showModalConfirmacion.value = false;

    // Recargar la aplicación después de 2.5 segundos para refrescar todos los stores
    setTimeout(() => {
      window.location.href = '/';
    }, 2500);
  } catch (err: any) {
    mensajeError.value = err?.response?.data?.message || err?.message || 'Error al restablecer el sistema';
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl">
    
    <!-- Cabecera -->
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
      <div>
        <div class="flex items-center gap-3">
          <span class="rounded-lg bg-red-100 p-2.5 text-2xl">🚨</span>
          <div>
            <h1 class="text-2xl font-bold text-gray-800">Restablecer Sistema</h1>
            <p class="text-sm text-gray-500">Módulo exclusivo para Administradores de Sistema</p>
          </div>
        </div>
      </div>
      <span class="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-semibold text-red-700">
        <span class="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
        Zona Administrativa Crítica
      </span>
    </div>

    <!-- Mensaje de Éxito -->
    <div v-if="mensajeExito" class="mb-6 rounded-xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-900 shadow-sm">
      <div class="flex items-center gap-3">
        <span class="text-3xl">✅</span>
        <div>
          <h3 class="font-bold text-base">¡Restablecimiento Completado!</h3>
          <p class="text-sm text-emerald-800 mt-0.5">{{ mensajeExito }}</p>
          <p class="text-xs text-emerald-700 font-semibold mt-2">Reiniciando la aplicación en unos momentos...</p>
        </div>
      </div>
    </div>

    <!-- Mensaje de Error -->
    <div v-if="mensajeError" class="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-red-900 shadow-sm">
      <div class="flex items-center gap-3">
        <span class="text-2xl">❌</span>
        <div>
          <h3 class="font-bold text-sm">Error en el proceso:</h3>
          <p class="text-xs text-red-700">{{ mensajeError }}</p>
        </div>
      </div>
    </div>

    <!-- Selector de Modo de Restablecimiento -->
    <div class="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 class="text-base font-bold text-gray-800 mb-1">1. Seleccione el Alcance del Restablecimiento</h2>
      <p class="text-xs text-gray-500 mb-5">Elija si desea limpiar únicamente las operaciones o realizar una instalación completamente limpia.</p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <!-- Opción 1: Limpieza Operacional -->
        <label
          class="relative flex flex-col justify-between rounded-xl border-2 p-5 cursor-pointer transition"
          :class="modoSeleccionado === 'OPERACIONES' ? 'border-brand bg-brand/5 shadow-xs ring-1 ring-brand' : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'"
        >
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-2xl">🧹</span>
              <input
                type="radio"
                name="modo"
                value="OPERACIONES"
                v-model="modoSeleccionado"
                class="h-4 w-4 text-brand focus:ring-brand"
              />
            </div>
            <h3 class="font-bold text-sm text-gray-800">Limpieza de Operaciones</h3>
            <p class="text-xs font-semibold text-emerald-700 mb-2">Recomendado para arrancar en vivo</p>
            <p class="text-xs text-gray-600 mb-3">
              Elimina todas las transacciones de prueba o movimientos pasados y deja los correlativos en 0.
            </p>
            
            <div class="rounded-lg bg-white border border-gray-200 p-3 text-xs space-y-1.5">
              <p class="font-semibold text-gray-700">🗑️ Se vaciarán:</p>
              <ul class="list-disc pl-4 text-gray-500 space-y-0.5">
                <li>Facturas de Venta y Devoluciones</li>
                <li>Recibos de Cobro y Cuentas por Cobrar (CxC)</li>
                <li>Compras, Pagos y Cuentas por Pagar (CxP)</li>
                <li>Movimientos y existencias de Inventario</li>
                <li>Reinicio de correlativos a 0 (FAC-001, RC-001)</li>
              </ul>
              <p class="font-semibold text-emerald-700 pt-1">✅ Se conservan:</p>
              <p class="text-gray-500 pl-2">Clientes, Proveedores, Métodos de Pago, Catálogo de Productos, Sucursales y Usuarios.</p>
            </div>
          </div>
        </label>

        <!-- Opción 2: Reset de Fábrica Total -->
        <label
          class="relative flex flex-col justify-between rounded-xl border-2 p-5 cursor-pointer transition"
          :class="modoSeleccionado === 'FABRICA' ? 'border-red-600 bg-red-50/40 shadow-xs ring-1 ring-red-600' : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'"
        >
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-2xl">🏭</span>
              <input
                type="radio"
                name="modo"
                value="FABRICA"
                v-model="modoSeleccionado"
                class="h-4 w-4 text-red-600 focus:ring-red-500"
              />
            </div>
            <h3 class="font-bold text-sm text-red-950">Instalación Limpia (Reset de Fábrica)</h3>
            <p class="text-xs font-semibold text-red-700 mb-2">Para reinstalaciones desde cero</p>
            <p class="text-xs text-gray-600 mb-3">
              Limpia completamente toda la base de datos como en una instalación nueva de fábrica.
            </p>

            <div class="rounded-lg bg-white border border-red-200 p-3 text-xs space-y-1.5">
              <p class="font-semibold text-red-800">💥 Se vaciará TODO:</p>
              <ul class="list-disc pl-4 text-gray-500 space-y-0.5">
                <li>Todas las operaciones y movimientos</li>
                <li>Clientes, Proveedores y Vendedores</li>
                <li>Catálogo de Productos, Categorías y Lotes</li>
                <li>Cuentas bancarias y bancos</li>
              </ul>
              <p class="font-semibold text-emerald-700 pt-1">🛡️ Se preserva:</p>
              <p class="text-gray-500 pl-2">Usuario Administrador, Roles, Métodos de Pago y Monedas base.</p>
            </div>
          </div>
        </label>

      </div>
    </div>

    <!-- Tarjeta de Advertencia y Botón de Acción -->
    <div class="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm mb-6">
      <div class="flex items-start gap-4">
        <div class="rounded-full bg-red-200 p-3 text-red-800 text-2xl shrink-0">
          ⚠️
        </div>
        <div class="flex-1">
          <h3 class="text-base font-bold text-red-950">Advertencia de Seguridad Crítica</h3>
          <p class="text-xs text-red-800 mt-1 leading-relaxed">
            Esta operación eliminará permanentemente los datos seleccionados y no se puede deshacer. Se recomienda realizar un respaldo de la base de datos antes de proceder si cuenta con información histórica de valor.
          </p>

          <div class="mt-5 flex justify-end">
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-red-700 hover:shadow-lg active:scale-95"
              @click="abrirModal"
            >
              <span>🚨</span>
              <span>Restablecer Sistema Ahora</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════════════
         MODAL EMERGENTE DE CONFIRMACIÓN DE SEGURIDAD
         ══════════════════════════════════════════════════════════════════════ -->
    <div v-if="showModalConfirmacion" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        <div class="flex items-center gap-3 border-b border-gray-100 pb-3">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-2xl text-red-600">
            ⚠️
          </div>
          <div>
            <h2 class="text-lg font-bold text-red-950">¿Confirmar Restablecimiento del Sistema?</h2>
            <p class="text-xs font-semibold text-red-700">Modo: {{ modoSeleccionado === 'FABRICA' ? '🏭 Instalación Limpia de Fábrica' : '🧹 Limpieza Operacional' }}</p>
          </div>
        </div>

        <div class="my-4 space-y-3 text-xs">
          <div class="rounded-lg border border-red-200 bg-red-50 p-3.5 text-red-900">
            <p class="font-bold mb-1">⚠️ ATENCIÓN: Se realizará una limpieza profunda de la base de datos:</p>
            <p class="text-xs leading-relaxed">
              {{ modoSeleccionado === 'FABRICA'
                ? 'Se eliminarán todas las transacciones, productos, clientes y movimientos para iniciar el sistema como nuevo.'
                : 'Se vaciarán todas las ventas, cobros, inventario, CxC, CxP y los correlativos volverán a iniciar en 0.'
              }}
            </p>
          </div>

          <div>
            <label class="block font-semibold text-gray-800 mb-1.5">
              Para confirmar, escriba la palabra <span class="font-mono font-bold text-red-600">RESTABLECER</span> a continuación:
            </label>
            <input
              v-model="confirmacionTexto"
              type="text"
              placeholder="Escriba RESTABLECER"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono uppercase tracking-wider text-gray-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20"
              @keyup.enter="ejecutarRestablecimiento"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 border-t border-gray-100 pt-3">
          <button
            type="button"
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            :disabled="isLoading"
            @click="showModalConfirmacion = false"
          >
            Cancelar
          </button>

          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-red-700 disabled:opacity-50"
            :disabled="confirmacionTexto.trim().toUpperCase() !== 'RESTABLECER' || isLoading"
            @click="ejecutarRestablecimiento"
          >
            <span v-if="isLoading" class="animate-spin">⏳</span>
            <span v-else>⚠️</span>
            <span>{{ isLoading ? 'Restableciendo...' : 'Confirmar y Restablecer' }}</span>
          </button>
        </div>

      </div>
    </div>

  </div>
</template>
