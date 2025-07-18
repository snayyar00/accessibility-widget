export async function customTokenCount(userId: number, tokenUsed: string[]): Promise<any> {
  const maxNum = tokenUsed.reduce((max, code) => {
    const m = code.match(/^custom(\d+)$/);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);

  const lastCustomCode = maxNum > 0 ? `custom${maxNum}` : null;
  const nonCustomCodes = tokenUsed.filter((code) => !/^custom\d+$/.test(code));

  return { lastCustomCode, nonCustomCodes };
}
