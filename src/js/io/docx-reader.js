// mammoth.js is loaded as a plain <script> tag and exposed as window.mammoth

export async function readDocxFile(file) {
  if (typeof mammoth === 'undefined') {
    throw new Error('文档解析库 (mammoth.js) 未正确加载，请刷新页面后重试');
  }
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    if (!result.value || result.value.trim().length === 0) {
      throw new Error('文档内容为空，或文档格式不受支持');
    }
    return result.value;
  } catch (err) {
    if (err.message.includes('mammoth') || err.message.includes('文档')) throw err;
    throw new Error(`解析 .docx 失败：${err.message}`);
  }
}
