const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, 'src/api');

// The list of modules and their endpoints.
const modules = {
  AnalysisType: ['create', 'read', 'update', 'delete', 'combo'],
  Client: ['create', 'read', 'update', 'delete', 'combo'],
  Control: [
    { name: 'create', method: 'post' },
    { name: 'read', method: 'get' },
    { name: 'update', method: 'post' },
    { name: 'delete', method: 'post' },
    { name: 'combo', method: 'post' },
    { name: 'arrange', method: 'post' },
  ],
  Department: [
    { name: 'create', method: 'post' },
    { name: 'read', method: 'get' },
    { name: 'update', method: 'post' },
    { name: 'delete', method: 'post' },
    { name: 'combo', method: 'post' },
  ],
  Device: ['create', 'read', 'update', 'delete', 'combo'],
  DeviceCategory: ['create', 'read', 'update', 'delete', 'combo'],
  ProcessingMethod: ['create', 'read', 'update', 'delete', 'combo'],
  ProcessingOption: ['create', 'read', 'update', 'delete', 'combo'],
  Reagent: ['create', 'read', 'update', 'delete', 'combo'],
  ReagentStorage: ['create', 'read', 'update', 'delete', 'combo'],
  ReferenceMaterial: ['create', 'read', 'update', 'delete', 'combo'],
  ReportCover: ['create', 'read', 'update', 'delete', 'combo'],
  ReportTable: ['create', 'read', 'update', 'delete', 'combo'],
  Role: ['create', 'read', 'update', 'delete', 'combo'],
  TaskType: ['create', 'read', 'update', 'delete', 'combo'],
  TestCategory: ['create', 'read', 'update', 'delete', 'combo'],
  TestItem: ['create', 'read', 'update', 'delete', 'combo'],
  TestMethod: ['create', 'read', 'update', 'delete', 'combo'],
};

// Also 'User' needs appending, handled separately

// Helper to convert PascalCase to camelCase
const toCamel = (s) => s[0].toLowerCase() + s.substring(1);

// Generate for each module
for (const [moduleName, endpoints] of Object.entries(modules)) {
  const fileName = toCamel(moduleName) + '.js';
  const filePath = path.join(apiDir, fileName);

  let content = "import instance from './request';\n\n";

  for (const ep of endpoints) {
    if (typeof ep === 'string') {
      const name = ep;
      const fnName = name + moduleName; // e.g. createAnalysisType
      content += `export const ${fnName} = data => instance.post("/Admin/${moduleName}/${name}", data);\n`;
    } else {
      const { name, method } = ep;
      const fnName = name + moduleName;
      if (method === 'get') {
        content += `export const ${fnName} = (params) => instance.get("/Admin/${moduleName}/${name}", { params });\n`;
      } else {
        content += `export const ${fnName} = data => instance.post("/Admin/${moduleName}/${name}", data);\n`;
      }
    }
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

// User is special, let's append to existing user.js
const userFilePath = path.join(apiDir, 'user.js');
let userContent = fs.readFileSync(userFilePath, 'utf8');

const userApiText = `
// Admin User APIs
export const createUser = data => instance.post("/Admin/User/create", data);
export const readUser = data => instance.post("/Admin/User/read", data);
export const updateUser = data => instance.post("/Admin/User/update", data);
export const deleteUser = data => instance.post("/Admin/User/delete", data);
export const comboUser = data => instance.post("/Admin/User/combo", data);
export const resetUser = data => instance.post("/Admin/User/reset", data);
`;

if (!userContent.includes('export const createUser')) {
  userContent += userApiText;
  fs.writeFileSync(userFilePath, userContent, 'utf8');
}

// Clean up old files
const oldFiles = [
  'but.js', 'company.js', 'cover.js', 'machining.js', 'menu.js', 
  'modus.js', 'report.js', 'routes.js', 'standard.js', 'standards.js', 'welcome.js'
];
for (const old of oldFiles) {
  const oldPath = path.join(apiDir, old);
  if (fs.existsSync(oldPath)) {
    fs.unlinkSync(oldPath);
  }
}
