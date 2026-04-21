import { ERROR_CODES, ParseError } from './errors.js';

const SHOT_INFO_RE = /^\d+-\d+/m;
const CHARACTER_RE = /人物[：:]/m;

export function validateEpisode({ num, content }) {
  const errors = [];

  if (!content || content.trim().length === 0) {
    errors.push(new ParseError(
      ERROR_CODES.E_NO_SHOTS, num,
      `第${num}集没有识别到任何内容`
    ));
    return errors;
  }

  if (!SHOT_INFO_RE.test(content)) {
    errors.push(new ParseError(
      ERROR_CODES.E_NO_HEADER, num,
      `第${num}集找不到分镜头信息行（格式如 "5-1 白天/内 场景名"）`
    ));
  }

  if (!CHARACTER_RE.test(content)) {
    errors.push(new ParseError(
      ERROR_CODES.E_NO_CHARACTERS, num,
      `第${num}集缺少人物行（格式如 "人物：张三、李四"）`
    ));
  }

  return errors;
}
