<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
    <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
      <h3 class="text-lg font-semibold text-gray-900">{{ $t('reports.table.title') }}</h3>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              {{ $t('reports.table.columns.property') }}
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              {{ $t('reports.table.columns.city') }}
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              {{ $t('reports.table.columns.rent') }}
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              {{ $t('reports.table.columns.status') }}
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              {{ $t('reports.table.columns.totalPaid') }}
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              {{ $t('reports.table.columns.delayed') }}
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              {{ $t('reports.table.columns.occupancy') }}
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr
            v-for="(row, index) in tableData"
            :key="index"
            class="hover:bg-gray-50 transition-colors"
            :class="{ 'bg-gray-50': index % 2 === 0 }"
          >
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              {{ row.property }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
              {{ row.city }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ formatCurrency(row.rent) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                :class="getStatusClass(row.status)"
              >
                {{ getStatusText(row.status) }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
              {{ formatCurrency(row.totalPaid) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <span v-if="row.delayed > 0" class="text-red-600 font-medium">
                {{ row.delayed }} {{ $t('reports.table.days') }}
              </span>
              <span v-else class="text-gray-400">-</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ row.occupancy }}%</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="tableData.length === 0" class="text-center py-12 text-gray-500">
      <p>{{ $t('reports.table.noData') }}</p>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from '@/composables/useLingui'
import { formatCurrency } from '@/utils/formatters'

const { t } = useI18n()

defineProps({
  tableData: {
    type: Array,
    required: true
  }
})

const getStatusClass = status => {
  if (status === 'occupied') return 'bg-green-100 text-green-800'
  if (status === 'vacant') return 'bg-gray-100 text-gray-800'
  return 'bg-yellow-100 text-yellow-800'
}

const getStatusText = status => {
  if (status === 'occupied') return t('properties.statusLabels.occupied')
  if (status === 'vacant') return t('properties.statusLabels.vacant')
  return t('common.unknown')
}
</script>
