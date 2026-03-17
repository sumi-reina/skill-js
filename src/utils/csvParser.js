/**
 * 友好度CSVを読み込み、都県間の友好度マップを返す
 *
 * CSVフォーマット:
 *   1行目: ヘッダー（x, 都県名1, 都県名2, ...）
 *   2行目以降: 行の都県 vs 列の都県の友好度（上三角のみ、下三角は "-"）
 */

// CSVテキストを解析して、都県リストと友好度マップを返す
export function parseAffinityCSV(csvText) {
  const lines = csvText.trim().split("\n").map((line) => line.trimEnd()); // 改行コードを取り除く
  const headers = lines[0].split(",");
  const prefs = headers.slice(1); // 1列目（x）を除いた都県名リスト

  const scores = {};

  for (let row = 1; row < lines.length; row++) {
    const cols = lines[row].split(",");
    const prefA = cols[0];

    for (let col = 1; col < cols.length; col++) {
      const val = cols[col].trim();
      if (val === "-") continue; // 値がハイフンの場合はスキップ

      const prefB = prefs[col - 1];
      const score = Number(val);
      if (isNaN(score)) continue;

      // キーは"都県A_都県B"の形式で統一（重複登録を防ぐ）
      const key = `${prefA}_${prefB}`;
      scores[key] = score;
    }
  }

  return { prefs, scores };
}

// グループ分けの友好度合計を計算する
// groups: [["東京都", "神奈川県"], ["埼玉県"], ...]
export function calcTotalScore(groups, scores) {
  let total = 0;

  for (const group of groups) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        const key = `${a}_${b}` in scores ? `${a}_${b}` : `${b}_${a}`;
        total += scores[key] ?? 0;
      }
    }
  }

  return total;
}