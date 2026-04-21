export function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error(`无法读取文件 "${file.name}"，请检查文件是否损坏`));
    reader.readAsText(file, 'utf-8');
  });
}
