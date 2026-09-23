<script setup lang="ts">
import { ref } from 'vue';
import * as XLSX from 'xlsx';
import SpinnerIcon from '@/components/ui/SpinnerIcon.vue';
import {
  useCustomerStore,
  type ImportCustomerItem,
  type ImportCustomerResult,
} from '../interfaces/customer.store';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'imported', result: ImportCustomerResult): void;
}>();

const customerStore = useCustomerStore();

const fileInput = ref<HTMLInputElement | null>(null);
const fileName = ref<string>('');
const parsedRows = ref<ImportCustomerItem[]>([]);
const parseError = ref<string>('');
const isSubmitting = ref<boolean>(false);
const importResult = ref<ImportCustomerResult | null>(null);

// Descarga la plantilla oficial en formato .xlsx
function downloadTemplate() {
  const headers = [
    'Tipo Documento (V/J/G/E)',
    'Número Documento / RIF',
    'Nombre / Razón Social',
    'Apellido',
    'Email',
    'Teléfono',
    'Límite de Crédito',
    'Días de Crédito',
    'Dirección / Notas',
    'Contribuyente Especial (SI/NO)',
  ];

  const sampleRow1 = [
    'V',
    '12345678',
    'JUAN PEREZ',
    'GARCIA',
    'juan.perez@example.com',
    '0414-1234567',
    '500.00',
    '15',
    'Av. Principal, Sector Centro, Edif. Apto 1',
    'NO',
  ];

  const sampleRow2 = [
    'J',
    '401234567',
    'ERP BUSINESS, C.A.',
    '',
    'contacto@example.com',
    '0276-7654321',
    '2000.00',
    '30',
    'Zona Industrial Los Andes, Galpón 4',
    'SI',
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow1, sampleRow2]);

  // Ancho estimado de columnas
  ws['!cols'] = [
    { wch: 25 },
    { wch: 25 },
    { wch: 35 },
    { wch: 20 },
    { wch: 30 },
    { wch: 20 },
    { wch: 18 },
    { wch: 16 },
    { wch: 40 },
    { wch: 28 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Clientes');
  XLSX.writeFile(wb, 'plantilla_importacion_clientes.xlsx');
}

// Procesa el archivo Excel seleccionado
async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  fileName.value = file.name;
  parseError.value = '';
  importResult.value = null;

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      parseError.value = 'El archivo no contiene hojas de cálculo.';
      return;
    }
    const worksheet = workbook.Sheets[firstSheetName];
    if (!worksheet) {
      parseError.value = 'No se pudo leer la primera hoja de cálculo.';
      return;
    }
    const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

    if (!jsonRows || jsonRows.length < 2) {
      parseError.value = 'El archivo está vacío o no contiene filas de datos tras los encabezados.';
      parsedRows.value = [];
      return;
    }

    const headers: string[] = (jsonRows[0] || []).map((h: any) =>
      String(h || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
    );

    // Mapeo inteligente de columnas
    const colTipoDoc = headers.findIndex((h) => h.includes('tipo') || h.includes('nac'));
    const colNumDoc = headers.findIndex((h) => h.includes('documento') || h.includes('rif') || h.includes('cedula') || h.includes('numero') || h.includes('codigo'));
    const colNombre = headers.findIndex((h) => h.includes('nombre') || h.includes('razon') || h.includes('cliente') || h.includes('descripcion'));
    const colApellido = headers.findIndex((h) => h.includes('apellido'));
    const colEmail = headers.findIndex((h) => h.includes('mail') || h.includes('correo'));
    const colTelefono = headers.findIndex((h) => h.includes('tel') || h.includes('cel') || h.includes('movil'));
    const colLimite = headers.findIndex((h) => h.includes('limite') || h.includes('credito'));
    const colDias = headers.findIndex((h) => h.includes('dias'));
    const colNotas = headers.findIndex((h) => h.includes('nota') || h.includes('direcc') || h.includes('observ'));
    const colContrib = headers.findIndex((h) => h.includes('contrib') || h.includes('especial'));

    const items: ImportCustomerItem[] = [];

    for (let r = 1; r < jsonRows.length; r++) {
      const row = jsonRows[r];
      if (!row || row.length === 0) continue;

      let rawCode = String(colNumDoc !== -1 ? row[colNumDoc] ?? '' : row[0] ?? '').trim();
      let nombre = String(colNombre !== -1 ? row[colNombre] ?? '' : row[1] ?? '').trim();

      // Si la fila está totalmente en blanco, omitirla
      if (!rawCode && !nombre) continue;

      let tipoDoc = String(colTipoDoc !== -1 ? row[colTipoDoc] ?? '' : '').trim().toUpperCase();
      let numDoc = rawCode;

      // Detección y normalización de prefijos venezolanos (V-, J-, G-, E-, P-, C-, CI-)
      const matchPrefix = rawCode.match(/^([A-Za-z]+)[-\s]*(.*)$/);
      if (matchPrefix && matchPrefix[1]) {
        const p = matchPrefix[1].toUpperCase();
        if (p === 'CI' || p === 'V') tipoDoc = 'V';
        else if (p === 'J') tipoDoc = 'J';
        else if (p === 'G') tipoDoc = 'G';
        else if (p === 'E') tipoDoc = 'E';
        else if (p === 'P') tipoDoc = 'P';
        else if (p === 'C') tipoDoc = 'C';
        else tipoDoc = p.slice(0, 5);

        numDoc = (matchPrefix[2] || '').trim() || rawCode;
      } else if (!tipoDoc) {
        tipoDoc = 'V';
      }

      const apellido = colApellido !== -1 ? String(row[colApellido] ?? '').trim() : '';
      const email = colEmail !== -1 ? String(row[colEmail] ?? '').trim() : '';
      const telefono = colTelefono !== -1 ? String(row[colTelefono] ?? '').trim() : '';
      const limite = colLimite !== -1 ? Number(row[colLimite]) || 0 : 0;
      const dias = colDias !== -1 ? Number(row[colDias]) || 0 : 0;
      const notas = colNotas !== -1 ? String(row[colNotas] ?? '').trim() : '';
      const contribRaw = colContrib !== -1 ? String(row[colContrib] ?? '').toUpperCase().trim() : 'NO';
      const contrib = contribRaw === 'SI' || contribRaw === 'S' || contribRaw === 'TRUE' || contribRaw === '1';

      items.push({
        tipo_documento: tipoDoc,
        numero_documento: numDoc,
        nombre,
        apellido: apellido || undefined,
        email: email || undefined,
        telefono: telefono || undefined,
        limite_credito: limite,
        dias_credito: dias,
        notas: notas || undefined,
        contribuyente_especial: contrib,
      });
    }

    if (items.length === 0) {
      parseError.value = 'No se encontraron clientes válidos en el archivo.';
      parsedRows.value = [];
      return;
    }

    parsedRows.value = items;
  } catch (err: any) {
    parseError.value = `Error leyendo el archivo: ${err.message || 'Formato no soportado'}`;
    parsedRows.value = [];
  }
}

// Envía el lote validado al backend
async function submitImport() {
  if (parsedRows.value.length === 0) return;

  isSubmitting.value = true;
  parseError.value = '';

  try {
    const result = await customerStore.importCustomers(parsedRows.value);
    importResult.value = result;
    emit('imported', result);
  } catch (err: any) {
    parseError.value = err.response?.data?.message || err.message || 'Error importando clientes.';
  } finally {
    isSubmitting.value = false;
  }
}

function resetForm() {
  fileName.value = '';
  parsedRows.value = [];
  parseError.value = '';
  importResult.value = null;
  if (fileInput.value) fileInput.value.value = '';
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 px-4 backdrop-blur-xs">
    <div class="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl border border-gray-200 flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-600 border border-emerald-200">
            📊
          </span>
          <div>
            <h2 class="text-lg font-bold text-gray-800">Importación Masiva de Clientes</h2>
            <p class="text-xs text-gray-500">Carga múltiples clientes desde un archivo Excel (.xlsx, .xls), CSV o TXT</p>
          </div>
        </div>
        <button
          type="button"
          class="text-gray-400 hover:text-gray-600 font-bold text-lg"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- Content Scroll Area -->
      <div class="flex-1 overflow-y-auto pr-1 space-y-4">
        <!-- Paso 1: Descargar Plantilla -->
        <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-3.5">
          <div class="text-xs text-blue-900">
            <span class="font-bold">1. Plantilla Oficial:</span> Descarga el formato con las columnas requeridas y filas de ejemplo.
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition active:scale-95"
            @click="downloadTemplate"
          >
            <span>📥 Descargar Plantilla Excel (.xlsx)</span>
          </button>
        </div>

        <!-- Paso 2: Selección de archivo -->
        <div class="rounded-xl border-2 border-dashed border-gray-300 p-6 text-center hover:border-brand/60 transition bg-gray-50/40">
          <input
            ref="fileInput"
            type="file"
            accept=".xlsx, .xls, .csv, .txt"
            class="hidden"
            @change="handleFileChange"
          />
          <div class="flex flex-col items-center justify-center gap-2">
            <span class="text-3xl">📁</span>
            <div v-if="!fileName" class="text-xs text-gray-600">
              <button
                type="button"
                class="font-bold text-brand hover:underline"
                @click="fileInput?.click()"
              >
                Haz clic para seleccionar el archivo (Excel / CSV / TXT)
              </button>
              <p class="text-gray-400 mt-0.5">Soporta formatos .xlsx, .xls, .csv y .txt (ej. exportaciones CSV de Saint/Profit)</p>
            </div>
            <div v-else class="flex items-center gap-2">
              <span class="font-bold text-xs text-gray-800 font-mono bg-white px-3 py-1 rounded-md border border-gray-200">
                📄 {{ fileName }}
              </span>
              <button
                type="button"
                class="text-xs text-brand font-semibold hover:underline"
                @click="fileInput?.click()"
              >
                Cambiar archivo
              </button>
            </div>
          </div>
        </div>

        <!-- Error Alert -->
        <div v-if="parseError" class="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          ⚠️ {{ parseError }}
        </div>

        <!-- Resultado de Importación (Éxito) -->
        <div v-if="importResult" class="rounded-xl border border-emerald-300 bg-emerald-50 p-4 space-y-2">
          <div class="flex items-center gap-2 text-sm font-bold text-emerald-900">
            <span>✅ ¡Importación completada con éxito!</span>
          </div>
          <div class="flex flex-wrap gap-4 text-xs font-semibold text-emerald-800">
            <span>Total Procesados: {{ importResult.total }}</span>
            <span>✨ Nuevos Creados: {{ importResult.creados }}</span>
            <span>🔄 Actualizados: {{ importResult.actualizados }}</span>
            <span v-if="importResult.errores.length" class="text-red-600">
              ⚠️ Omitidos con error: {{ importResult.errores.length }}
            </span>
          </div>

          <div v-if="importResult.errores.length" class="mt-2 rounded-lg bg-white p-2 border border-red-200 text-xs text-red-700 max-h-32 overflow-y-auto">
            <p class="font-bold mb-1">Detalle de registros no importados:</p>
            <ul class="list-disc list-inside space-y-0.5">
              <li v-for="(err, idx) in importResult.errores" :key="idx">
                <span class="font-mono font-bold">{{ err.documento }}</span>: {{ err.motivo }}
              </li>
            </ul>
          </div>
        </div>

        <!-- Paso 3: Previsualización de Datos -->
        <div v-if="parsedRows.length > 0 && !importResult" class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-gray-700">
              Se detectaron <span class="text-brand font-extrabold">{{ parsedRows.length }}</span> clientes listos para importar:
            </span>
          </div>

          <div class="max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-inner">
            <table class="w-full text-left text-xs">
              <thead class="sticky top-0 bg-gray-100 text-gray-600 font-bold border-b border-gray-200">
                <tr>
                  <th class="px-3 py-2">Doc.</th>
                  <th class="px-3 py-2">Nombre / Razón Social</th>
                  <th class="px-3 py-2">Teléfono</th>
                  <th class="px-3 py-2">Email</th>
                  <th class="px-3 py-2 text-right">Límite Crédito</th>
                  <th class="px-3 py-2 text-center">Especial</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="(cli, idx) in parsedRows" :key="idx" class="hover:bg-gray-50/80">
                  <td class="px-3 py-1.5 font-mono font-bold text-gray-700">
                    {{ cli.tipo_documento }}-{{ cli.numero_documento }}
                  </td>
                  <td class="px-3 py-1.5 font-medium text-gray-900">
                    {{ cli.nombre }} {{ cli.apellido || '' }}
                  </td>
                  <td class="px-3 py-1.5 text-gray-600 font-mono">{{ cli.telefono || '—' }}</td>
                  <td class="px-3 py-1.5 text-gray-600">{{ cli.email || '—' }}</td>
                  <td class="px-3 py-1.5 text-right font-mono">${{ Number(cli.limite_credito || 0).toFixed(2) }}</td>
                  <td class="px-3 py-1.5 text-center">
                    <span v-if="cli.contribuyente_especial" class="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      SI
                    </span>
                    <span v-else class="text-gray-400 text-[10px]">NO</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="mt-4 flex items-center justify-between border-t border-gray-200 pt-3">
        <button
          type="button"
          class="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
          @click="emit('close')"
        >
          {{ importResult ? 'Cerrar' : 'Cancelar' }}
        </button>

        <div class="flex items-center gap-2">
          <button
            v-if="parsedRows.length > 0 && !importResult"
            type="button"
            class="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100"
            @click="resetForm"
          >
            Limpiar
          </button>

          <button
            v-if="parsedRows.length > 0 && !importResult"
            type="button"
            :disabled="isSubmitting"
            class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 transition disabled:opacity-50 active:scale-95"
            @click="submitImport"
          >
            <SpinnerIcon v-if="isSubmitting" class="h-4 w-4 animate-spin text-white" />
            <span>{{ isSubmitting ? 'Importando Clientes...' : `🚀 Confirmar e Importar (${parsedRows.length})` }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
