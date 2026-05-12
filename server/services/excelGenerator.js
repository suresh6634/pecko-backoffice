import xlsx from 'xlsx'

export function generateProductImport(parent, children) {
  const headers = [
    'External ID',
    'Name',
    'Internal Reference',
    'Unit of Measure',
    'Manufacturer/Customer Name',
    'MPN/Customer/Supplier Part No',
    'Sales',
    'Purchase',
    'Product Type',
    'routes',
    'Description',
  ]

  function toRow(item) {
    return [
      `__export__.product_template_${item.itemId}`,
      item.itemId,
      item.itemId,
      item.uom,
      item.manufacturer || '',
      item.manufacturerPartNo || '',
      'TRUE',
      'TRUE',
      'Goods',
      'PEI - Buy from Vendor',
      item.itemName,
    ]
  }

  const data = [headers, toRow(parent), ...children.map(toRow)]

  const ws = xlsx.utils.aoa_to_sheet(data)
  const wb = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(wb, ws, 'Products')
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

export function generateBomImport(parent, children) {
  const headers = [
    'Product',
    'Product/MPN/Customer/Supplier Part No',
    'Product/MPN/Customer/Supplier Part No',
    'BOM Lines/Position',
    'BoM Lines/Display Name',
    'BoM Lines/Part Number',
    'BoM Lines/Description',
    'BoM Lines/Manufacturer',
    'BoM Lines/Product Unit of Measure',
    'BoM Lines/Quantity',
  ]

  const data = [headers]

  children.forEach((child, idx) => {
    const childCols = [
      child.findNo,
      child.itemId,
      child.manufacturerPartNo || '',
      child.itemName,
      child.manufacturer || '',
      child.uom,
      child.quantity,
    ]

    if (idx === 0) {
      data.push([parent.itemId, parent.itemId, '1', ...childCols])
    } else {
      data.push(['', '', '', ...childCols])
    }
  })

  const ws = xlsx.utils.aoa_to_sheet(data)
  const wb = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(wb, ws, 'BOM')
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' })
}
