const fs = require('fs');
const path = require('path');
const parse = require('csv-parse/sync').parse; // 新增

const csvPath = '../../tmp-data/material.csv';

const supplierMap = [
  { col: '拼拼订', supplier_id: 1 },
  { col: '包佬弟', supplier_id: 2 },
  { col: '包篮子', supplier_id: 3 },
  { col: '快驴', supplier_id: 4 },
];

// 删除 parseCSVLine

fs.readFile(csvPath, 'utf8', (err, data) => {
  if (err) throw err;
  // 使用 csv-parse 解析，columns 传递函数，遇到重复列名只保留第一次
  const records = parse(data, {
    columns: (header) => {
      const seen = new Set();
      return header.map(col => {
        if (seen.has(col)) return undefined;
        seen.add(col);
        return col;
      });
    },
    skip_empty_lines: true
  });
  const sqls = [];
  records.forEach(row => {
    const material_id = row[Object.keys(row)[0]];
    supplierMap.forEach(({ col, supplier_id }) => {
      const priority = row[col];
      if (priority) {
        sqls.push(
          `INSERT INTO material_supplier (material_id, supplier_id, supplier_priority) VALUES (${material_id}, ${supplier_id}, '${priority}');`
        );
      }
    });
  });
  fs.writeFileSync(
    path.join(__dirname, 'material_supplier.sql'),
    sqls.join('\n'),
    'utf8'
  );
  console.log('SQL已生成: material_supplier.sql');
});