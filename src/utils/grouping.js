/**
 * 友好度の総和が最大となるグループ分けを全探索で求める
 *
 * 各都県に0〜2のグループ番号を割り当てる全パターン(3^8 = 6561通り)を
 * ループで総当たりし、友好度合計が最大の組み合わせを返す。
 */

import { calcTotalScore } from "./csvParser";

// 最大グループ数(3グループ以下)
const MAX_GROUPS = 3;

// 都県リストを最大3グループに分ける全パターンを配列で返す
function getAllAssignments(prefCount, maxGroups) {
  const results = [];
  const total = Math.pow(maxGroups, prefCount); // 3^8 = 6561

  for (let i = 0; i < total; i++) {
    const assignment = [];
    let num = i;

    // iを3進数に変換し、各都県のグループ番号を取り出す
    for (let j = 0; j < prefCount; j++) {
      assignment.push(num % maxGroups);
      num = Math.floor(num / maxGroups);
    }

    // グループが3つ以下になるパターンのみ有効(0,1,2が連続して使われているか確認)
    const usedGroups = new Set(assignment);
    // グループ番号が飛び番にならないよう正規化されているか確認する
    let isValid = true;
    for (let g = 0; g < usedGroups.size; g++) {
      if (!usedGroups.has(g)) { isValid = false; break; }
    }
    if (isValid) results.push(assignment);
  }

  return results;
}

// 都県名のグループ配列に変換する
// 例: assignment=[0,0,1,1,2] → groups=[["東京都","神奈川県"], ["埼玉県","千葉県"], ["茨城県"]]
function assignmentToGroups(prefs, assignment) {
  const groups = {};
  assignment.forEach((groupIndex, i) => {
    if (!groups[groupIndex]) groups[groupIndex] = [];
    groups[groupIndex].push(prefs[i]);
  });
  return Object.values(groups);
}

// 友好度の総和が最大となるグループ分けを返す
export function findBestGrouping(prefs, scores) {
  const allAssignments = getAllAssignments(prefs.length, MAX_GROUPS);
  const results = [];

  for (const assignment of allAssignments) {
    const groups = assignmentToGroups(prefs, assignment);
    const score = calcTotalScore(groups, scores);
    results.push({ groups, score });
  }

  // 友好度の高い順にソート
  results.sort((a, b) => b.score - a.score);

  const bestGroups = results[0].groups
    .map((group) => ({
      group,
      score: calcTotalScore([group], scores), // グループ単体の友好度を計算
    }))
    .sort((a, b) => b.score - a.score)        // 友好度を降順にソート
    .map(({ group }) => group);               // グループ名の配列だけ取り出す

  return {
    groups: bestGroups,
    totalScore: results[0].score,
  };
}