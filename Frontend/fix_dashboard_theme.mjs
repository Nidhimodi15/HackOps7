import fs from 'fs';
const path = './src/pages/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/background: '#fff'/g, "background: 'var(--bg-surface)'");
content = content.replace(/hover:bg-\\[#F8FAFC\\]/g, "hover:bg-[var(--bg-page)]");
content = content.replace(/bg: '#FFF0F0'/g, "bg: 'var(--color-danger-soft)'");
content = content.replace(/bg: '#FFFBEB'/g, "bg: 'var(--color-warning-soft)'");
content = content.replace(/bg: '#EEF1FD'/g, "bg: 'var(--color-primary-soft)'");
content = content.replace(/bg: '#F8FAFC'/g, "bg: 'var(--bg-page)'");
content = content.replace(/'#4361EE'/g, "'var(--color-primary)'");

fs.writeFileSync(path, content);
