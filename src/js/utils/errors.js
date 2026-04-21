export const ERROR_CODES = {
  E_NO_EPISODES: 'E_NO_EPISODES',
  E_NO_HEADER: 'E_NO_HEADER',
  E_NO_CHARACTERS: 'E_NO_CHARACTERS',
  E_NO_SHOTS: 'E_NO_SHOTS',
  E_BAD_EPISODE_NUM: 'E_BAD_EPISODE_NUM',
  W_MISSING_LINK: 'W_MISSING_LINK',
  W_DUPLICATE_LINK: 'W_DUPLICATE_LINK',
};

export class ParseError extends Error {
  constructor(code, episodeNum, message) {
    super(message);
    this.name = 'ParseError';
    this.code = code;
    this.episodeNum = episodeNum;
    this.isFatal = !code.startsWith('W_');
  }
}
