// 本地归纳引擎：不依赖任何外部 API，也能把原始材料整理成结构稳定的笔记。
// 设计目标是「可预测、可测试、可替换」：AI 增强只负责改写，不改变输出 schema。
import { SUBJECTS } from './data/subjects.mjs';

const CJK_RE = /[\u3400-\u9fff]/;
const LATIN_RE = /[A-Za-z]/;
const SENTENCE_CUES = /(因此|所以|主要|關鍵|关键|重點|重点|原則|原则|步驟|步骤|原因|影響|影响|作用|功能|特點|特点|定義|定义|公式|注意|例如|即|表示|意味著|意味着)/;
const PITFALL_CUES = /(注意|留意|小心|切記|切记|易錯|易错|常見錯誤|常见错误|陷阱|不要|切勿|勿|避免|容易混淆|區別|区别|except|note that|common mistake|careful|mistake)/i;
const EXAMPLE_CUES = /^(例如|例子|譬如|比如|例：|例:|e\.g\.|for example)/i;
const HEADING_END = /[：:]$/;

const STOPWORDS = new Set([
  '的', '了', '是', '在', '和', '與', '与', '及', '或', '而', '但', '就', '都', '也', '很', '被', '把', '為', '为',
  '以', '於', '于', '其', '此', '這', '这', '那', '有', '無', '无', '不', '可', '會', '会', '能', '要', '從', '从',
  '對', '对', '由', '使', '讓', '让', '給', '给', '將', '将', '並', '并', '且', '則', '则', '所', '者', '之', '乎',
  '矣', '焉', '哉', '我', '你', '他', '她', '它', '們', '们', '個', '个', '些', '時', '时', '候', '中', '上', '下',
  '內', '内', '外', '前', '後', '后', '間', '间', '來', '来', '去', '到', '說', '说', '做', '用', '得', '過', '过',
  '著', '着', '嗎', '吗', '呢', '吧', '啊', '一個', '一种', '一種', '一些', '這個', '这个', '那個', '那个', '我們',
  '我们', '你們', '你们', '他們', '他们', '可以', '可能', '需要', '必須', '必须', '已經', '已经', '因為', '因为',
  '所以', '但是', '如果', '而且', '以及', '更加', '非常', '比較', '比较', '主要', '重要', '例如', '等等', '甚麼',
  '什么', '什麼', '如何', '為甚麼', '为什么', '因此', '然後', '然后', '還是', '还是', '就是', '不是', '沒有', '没有',
  '進行', '进行', '使用', '產生', '产生', '形成', '包括', '屬於', '属于', '具有', '通過', '通过', '根據', '根据',
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'than', 'that', 'this', 'these', 'those', 'is', 'are',
  'was', 'were', 'be', 'been', 'being', 'to', 'of', 'in', 'on', 'at', 'for', 'from', 'with', 'by', 'as', 'it',
  'its', 'we', 'you', 'they', 'he', 'she', 'i', 'not', 'can', 'could', 'should', 'would', 'may', 'might', 'will',
  'have', 'has', 'had', 'do', 'does', 'did', 'so', 'such', 'into', 'about', 'more', 'most', 'some', 'any', 'all',
  'each', 'other', 'which', 'who', 'whom', 'what', 'when', 'where', 'why', 'how', 'there', 'their', 'our', 'your',
]);

// 学科术语表：用于提升关键词质量，并兼容简繁两种写法。
const SUBJECT_TERMS = {
  bio: ['光合作用', '呼吸作用', '酶', '细胞', '細胞', '叶绿体', '葉綠體', '类囊体', '類囊體', '卡尔文循环', '卡尔文循環', '基因', '染色体', '染色體', 'DNA', 'RNA', '蛋白质', '蛋白質', '扩散', '擴散', '渗透', '滲透', '主动运输', '主動運輸', '有丝分裂', '有絲分裂', '减数分裂', '減數分裂', '血糖', '胰岛素', '胰島素', '生态系统', '生態系統', '能量流动', '能量流動', '营养级', '營養級', '限制因子', '蒸腾作用', '蒸騰作用', '气孔', '氣孔', '细胞膜', '細胞膜', '线粒体', '線粒體', '免疫', '疫苗', '抗体', '抗體', '生态位', '生态位', '种群', '種群', '群落', '生物多样性', '生物多樣性', '基因突变', '基因突變', '自然选择', '自然選擇'],
  chem: ['原子', '分子', '离子', '離子', '化合物', '元素', '周期表', '週期表', '化学键', '化學鍵', '离子键', '離子鍵', '共价键', '共價鍵', '金属键', '金屬鍵', '摩尔', '摩爾', '摩尔质量', '摩爾質量', '浓度', '濃度', 'pH', '酸碱', '酸鹼', '中和', '氧化', '还原', '還原', '氧化数', '氧化數', '电解', '電解', '化学平衡', '化學平衡', '勒夏特列', '平衡常数', '平衡常數', '有机物', '有機物', '烷烃', '烷烴', '烯烃', '烯烴', '醇', '羧酸', '酯化', '聚合物', '聚合體', '实验式', '实验式', '分子式', '同素异形体', '同素異形體', '催化剂', '催化劑', '放热', '放熱', '吸热', '吸熱', '焓变', '焓變'],
  phy: ['力', '质量', '質量', '加速度', '速度', '位移', '动量', '動量', '冲量', '衝量', '功', '功率', '能量', '动能', '動能', '势能', '勢能', '热', '熱', '温度', '溫度', '比热容', '比熱容', '潜热', '潛熱', '压强', '壓強', '密度', '波', '波长', '波長', '频率', '頻率', '振幅', '折射', '反射', '全反射', '临界角', '臨界角', '电流', '電流', '电压', '電壓', '电阻', '電阻', '欧姆定律', '歐姆定律', '串联', '串聯', '并联', '並聯', '磁场', '磁場', '电磁感应', '電磁感應', '半衰期', '放射性', '核裂变', '核裂變', '核聚变', '核聚變', '误差', '誤差', '有效数字', '有效數字'],
  math: ['函数', '函數', '方程', '不等式', '二次函数', '二次函數', '抛物线', '拋物線', '顶点', '頂點', '对称轴', '對稱軸', '判别式', '判別式', '因式分解', '公式', '数列', '數列', '等差数列', '等差數列', '等比数列', '等比數列', '概率', '概率', '统计', '統計', '平均数', '平均數', '中位数', '中位數', '众数', '眾數', '标准差', '標準差', '三角函数', '三角函數', '正弦', '余弦', '餘弦', '正切', '对数', '對數', '指数', '指數', '向量', '矩阵', '矩陣', '行列式', '导数', '導數', '积分', '積分', '极限', '極限', '坐标', '座標', '斜率', '圆心', '圓心', '半径', '半徑', '体积', '體積', '面积', '面積'],
  econ: ['需求', '供给', '供給', '均衡', '价格', '價格', '数量', '數量', '弹性', '彈性', '边际', '邊際', '机会成本', '機會成本', '稀缺', '稀缺性', '市场', '市場', '垄断', '壟斷', '竞争', '競爭', '消费者', '消費者', '生产者', '生產者', '国内生产总值', '國內生產總值', 'GDP', '通货膨胀', '通貨膨脹', '失业', '失業', '货币', '貨幣', '银行', '銀行', '利率', '汇率', '匯率', '贸易', '貿易', '比较优势', '比較優勢', '进口', '進口', '出口', '财政政策', '財政政策', '货币政策', '貨幣政策', '外部性', '公共物品', '公共物品'],
  bafs: ['资产', '資產', '负债', '負債', '资本', '資本', '权益', '權益', '借方', '贷方', '貸方', '分录', '分錄', '日记账', '日記賬', '分类账', '分類賬', '试算表', '試算表', '损益表', '損益表', '资产负债表', '資產負債表', '现金流量表', '現金流量表', '折旧', '折舊', '直线法', '直線法', '成本', '固定成本', '变动成本', '變動成本', '贡献毛利', '貢獻毛利', '盈亏平衡', '盈虧平衡', '流动比率', '流動比率', '毛利率', '毛利', '净利', '淨利', '存货', '存貨', '先进先出', '先進先出'],
  geog: ['板块', '板塊', '构造', '構造', '俯冲', '俯衝', '海沟', '海溝', '火山', '地震', '侵蚀', '侵蝕', '风化', '風化', '搬运', '搬運', '沉积', '沉積', '河流', '地貌', '海岸', '天气', '天氣', '气候', '氣候', '季风', '季風', '热带辐合带', '熱帶輻合帶', '城市化', '土地利用', '竞租', '競租', '人口', '迁移', '遷移', '农业', '農業', '工业', '工業', '可持续发展', '可持續發展', '生态系统', '生態系統', '温室效应', '溫室效應', '碳中和', '碳达峰', '碳達峰', '实地考察', '實地考察'],
  hist: ['一战', '一戰', '二战', '二戰', '凡尔赛', '凡爾賽', '冷战', '冷戰', '围堵', '圍堵', '马歇尔计划', '馬歇爾計劃', '绥靖', '綏靖', '法西斯', '纳粹', '納粹', '殖民', '帝国主义', '帝國主義', '民族主义', '民族主義', '工业革命', '工業革命', '文艺复兴', '文藝復興', '宗教改革', '启蒙运动', '啟蒙運動', '法国大革命', '法國大革命', '联合国', '聯合國', '华沙公约', '華沙公約', '北约', '北約', '古巴导弹危机', '古巴導彈危機', '柏林墙', '柏林牆', '香港史', '工业化', '工業化', '转口贸易', '轉口貿易'],
  chist: ['秦朝', '汉朝', '漢朝', '郡县制', '郡縣制', '分封制', '中央集权', '中央集權', '科举', '科舉', '进士', '進士', '隋唐', '贞观之治', '貞觀之治', '开元盛世', '開元盛世', '安史之乱', '安史之亂', '宋朝', '明朝', '清朝', '鸦片战争', '鴉片戰爭', '南京条约', '南京條約', '洋务运动', '洋務運動', '戊戌变法', '戊戌變法', '辛亥革命', '民国', '民國', '五四运动', '五四運動', '抗日战争', '抗日戰爭', '改革开放', '改革開放', '一国两制', '一國兩制', '丝绸之路', '絲綢之路', '王安石', '汉武帝', '漢武帝', '董仲舒'],
  chi: ['文言', '实词', '實詞', '虚词', '虛詞', '句式', '通假字', '词类活用', '詞類活用', '修辞', '修辭', '比喻', '拟人', '擬人', '夸张', '誇張', '排比', '反问', '反問', '论证', '論證', '论点', '論點', '论据', '論據', '立意', '审题', '審題', '记叙', '記敘', '说明文', '說明文', '议论文', '議論文', '散文', '小说', '小說', '诗歌', '詩歌', '意象', '意境', '借景抒情', '托物言志', '对比', '對比', '衬托', '襯托', '主旨', '段落', '开头', '開頭', '结尾', '結尾'],
  eng: ['tenses', 'tense', 'passive', 'active', 'preposition', 'collocation', 'inference', 'tone', 'register', 'paragraph', 'topic sentence', 'linking words', 'conditional', 'relative clause', 'reported speech', 'subject-verb agreement', 'vocabulary', 'summary', 'argument', 'evidence', 'coherence', 'cohesion', 'formal', 'informal'],
  csd: ['一国两制', '一國兩制', '基本法', '法治', '人权', '人權', '公共政策', '公民', '社会责任', '社會責任', '国家发展', '國家發展', '全球化', '公共卫生', '公共衛生', '疫苗', '能源', '科技', '文化多元', '可持续发展', '可持續發展', '碳中和', '碳达峰', '碳達峰', '大湾区', '大灣區', '气候变化', '氣候變化', '贫困', '貧困', '不平等', '专题研习', '專題研習'],
  ict: ['电脑', '電腦', '硬件', '硬體', '软件', '軟件', '操作系统', '操作系統', 'CPU', 'RAM', 'ROM', '二进制', '二進制', '十六进制', '十六進制', '编程', '編程', '算法', '演算法', '变量', '變量', '循环', '循環', '函数', '函數', '数据库', '數據庫', '主键', '主鍵', '外键', '外鍵', 'SQL', '网络', '網絡', '协议', '協議', 'HTTP', 'TCP', 'IP', '加密', '防火墙', '防火牆', '网络钓鱼', '網絡釣魚', '病毒', '多媒体', '多媒體', '像素', '分辨率', '解析度'],
  m1: ['二项式', '二項式', '极限', '極限', '导数', '導數', '微分', '积分', '積分', '正态分布', '正態分佈', '概率密度', '期望', '方差', '标准差', '標準差', '置信区间', '置信區間', '自然对数', '自然對數', '链式法则', '鏈式法則', '乘积法则', '乘積法則', '商法则', '商法則'],
  m2: ['数学归纳法', '數學歸納法', '二项式', '二項式', '向量', '点积', '點積', '叉积', '叉積', '矩阵', '矩陣', '行列式', '逆矩阵', '逆矩陣', '特征值', '特徵值', '微分', '积分', '積分', '偏导数', '偏導數', '定积分', '定積分', '换元法', '換元法', '分部积分', '分部積分'],
  isci: ['科学方法', '科學方法', '假设', '假設', '实验', '實驗', '变量', '變量', '控制变量', '控制變量', '原子', '分子', '粒子', '元素', '化合物', '混合物', '物理变化', '物理變化', '化学变化', '化學變化', '能量', '力', '细胞', '細胞', '生物', '生态', '生態', '地球', '岩石', '水循环', '水循環', '太阳系', '太陽系'],
};

const SUBJECT_EXAM_HINTS = {
  bio: ['解释题先写「结构 → 功能 → 结果」的因果链。', '比较题用表格列出两项的相同点与不同点。', '实验题写清自变量、因变量、控制变量与对照。'],
  chem: ['计算题先写已知、单位与公式，再代入。', '解释性质时联系结构（键、粒子间作用力）。', '写化学方程式后必须配平并标状态。'],
  phy: ['计算题先列公式，再代入数值和单位。', '解释题说明物理量之间的关系与方向。', '实验题说明误差来源与如何改善。'],
  math: ['卷一写出完整步骤，关键公式不能跳。', '卷二先排除明显错误选项，再代入特殊值。', '答案要带单位，并检查是否在定义域内。'],
  econ: ['画供需图并标清楚移动方向与新均衡。', '用「因为 → 所以」写因果链，不要只写结论。', '弹性题先算百分比，再判断总收益变化。'],
  bafs: ['分录题先判断影响哪两项会计要素。', '报表题注意日期、净额与分类。', '个案题先写概念，再套用数字。'],
  geog: ['数据题先描述趋势，再解释原因。', '地图题注意比例尺、方向与图例。', '案例题要具体到地名与过程。'],
  hist: ['论述题先立论，再用史实分层论证。', '史料题注意作者、时间、立场与局限。', '比较题说明相似与相异，并下判断。'],
  chist: ['史料题先圈出关键词，再联系时代背景。', '论述题要有明确论点与史实支撑。', '评价题兼顾正面与负面影响。'],
  chi: ['审题先圈出关键词、文体与写作对象。', '阅读题引用原文并解释，不要只抄。', '写作段落之间要有过渡与照应。'],
  eng: ['Writing 先花 3 分钟审题与列提纲。', 'Reading 先看题目关键词，再定位原文。', '检查 tense、agreement 与 word form。'],
  csd: ['多角度分析：个人、社会、国家、全球。', '用具体例子与数据支撑观点。', '结论要回应题目中的价值判断。'],
  ict: ['定义题用完整句子，不要只写关键词。', '比较题列出 2–3 个维度。', 'SQL 题检查 SELECT / FROM / WHERE 结构。'],
  m1: ['求导题写清法则与每一步。', '积分题注意常数与上下限。', '统计题写清分布与标准化步骤。'],
  m2: ['证明题写清基础步骤与归纳假设。', '矩阵题检查维度与行列式。', '积分题注意换元与上下限。'],
  isci: ['实验题写清变量、对照与重复。', '解释现象时联系粒子或能量模型。', '数据题注意单位与有效数字。'],
};

function scoreTerms(text, subjectCode) {
  const candidates = new Map();
  const add = (term, count, bonus = 0) => {
    const key = term.trim();
    if (!key) return;
    const current = candidates.get(key) || { term: key, count: 0, bonus: 0 };
    current.count += count;
    current.bonus = Math.max(current.bonus, bonus);
    candidates.set(key, current);
  };

  for (const term of SUBJECT_TERMS[subjectCode] || []) {
    let index = 0;
    let count = 0;
    const lowerText = text.toLowerCase();
    const needle = term.toLowerCase();
    while ((index = lowerText.indexOf(needle, index)) !== -1) {
      count += 1;
      index += needle.length;
    }
    if (count > 0) add(term, count, 2.5);
  }

  let segmenter = null;
  try {
    segmenter = new Intl.Segmenter('zh-Hans', { granularity: 'word' });
  } catch {
    segmenter = null;
  }
  if (segmenter) {
    for (const part of segmenter.segment(text)) {
      if (!part.isWordLike) continue;
      let word = part.segment.trim();
      if (!word) continue;
      if (LATIN_RE.test(word)) word = word.toLowerCase();
      if (word.length < 2) continue;
      if (STOPWORDS.has(word)) continue;
      if (/^\d+([.,]\d+)?$/.test(word)) continue;
      if (/^[^\u3400-\u9fffA-Za-z]+$/.test(word)) continue;
      if (word.length > 16) continue;
      add(word, 1, 0);
    }
  } else {
    // 退化路径：使用 2–4 字 n-gram，保证旧环境仍可工作。
    const runs = text.match(/[\u3400-\u9fff]{2,}/g) || [];
    for (const run of runs) {
      for (let n = 2; n <= 4; n += 1) {
        for (let i = 0; i + n <= run.length; i += 1) {
          const gram = run.slice(i, i + n);
          if (STOPWORDS.has(gram)) continue;
          add(gram, 1, 0);
        }
      }
    }
  }

  const scored = [...candidates.values()]
    .map((item) => ({
      ...item,
      score: item.count * (item.term.length >= 3 ? 1.65 : 1) + item.bonus * 3,
    }))
    .filter((item) => item.count >= 1 && item.score >= 1.4)
    .sort((a, b) => b.score - a.score || b.term.length - a.term.length);

  const selected = [];
  for (const item of scored) {
    if (selected.length >= 14) break;
    const covered = selected.some(
      (picked) =>
        (picked.term.includes(item.term) && picked.score >= item.score * 0.85) ||
        (item.term.includes(picked.term) && item.score > picked.score * 1.4),
    );
    if (covered) continue;
    selected.push(item);
  }

  // 去掉被更长词完全覆盖且分数接近的短词。
  const pruned = selected.filter((item) => {
    return !selected.some(
      (other) =>
        other !== item &&
        other.term.includes(item.term) &&
        other.term.length > item.term.length &&
        other.count >= item.count * 0.7,
    );
  });
  return (pruned.length ? pruned : selected).slice(0, 12).map((item) => item.term);
}

function cleanHeading(text) {
  return text
    .replace(/^#{1,6}\s*/, '')
    .replace(/^第[一二三四五六七八九十百\d]+[章課课節节單元单元篇讲講]\s*[：:、.．\s]*/, '')
    .replace(/^[一二三四五六七八九十]+[、.．]\s*/, '')
    .replace(/^[（(][一二三四五六七八九十]+[）)]\s*/, '')
    .replace(/[：:]\s*$/, '')
    .trim();
}

function isHeading(line) {
  if (!line) return false;
  if (/^#{1,6}\s+\S/.test(line)) return true;
  if (line.length > 42) return false;
  if (/^第[一二三四五六七八九十百\d]+[章課课節节單元单元篇讲講]/.test(line)) return true;
  if (/^[一二三四五六七八九十]+[、.．]\s*\S/.test(line) && line.length <= 28) return true;
  if (/^[（(][一二三四五六七八九十]+[）)]\s*\S/.test(line) && line.length <= 28) return true;
  if (HEADING_END.test(line) && line.length <= 32 && !/[。！？!?]/.test(line)) return true;
  if (/^[A-Z][A-Z0-9 &,'\-]{4,40}$/.test(line) && line.split(/\s+/).length <= 7) return true;
  return false;
}

function joinLine(prev, next) {
  if (!prev) return next;
  if (!next) return prev;
  const left = prev[prev.length - 1];
  const right = next[0];
  if (CJK_RE.test(left) && CJK_RE.test(right)) return prev + next;
  return `${prev} ${next}`;
}

function stripListMarker(line) {
  return line.replace(/^[-•*·]\s*/, '').replace(/^\d+[.)、]\s*/, '').replace(/^[（(]\d+[）)]\s*/, '').trim();
}

function isListLine(line) {
  return /^[-•*·]\s+/.test(line) || /^\d+[.)、]\s+/.test(line) || /^[（(]\d+[）)]\s+/.test(line);
}

export function normalizeText(input) {
  if (!input) return '';
  let text = String(input)
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b\u200c\u200d\ufeff]/g, '')
    .replace(/\t/g, '  ')
    .normalize('NFC');

  // OCR 常把中文逐字隔开；只去掉同一行内的空白，绝不能吞掉换行与段落结构。
  text = text.replace(/([\u3400-\u9fff])[ \t]+(?=[\u3400-\u9fff])/g, '$1');
  text = text.replace(/([\u3400-\u9fff])[ \t]+([，。；：、！？）」』】])/g, '$1$2');
  text = text.replace(/([（「『【])[ \t]+([\u3400-\u9fff])/g, '$1$2');
  text = text.replace(/[ \t]{2,}/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  // 去掉独立页码行。
  text = text
    .split('\n')
    .filter((line) => !/^\s*(第?\s*\d{1,4}\s*[頁页]?|page\s*\d{1,4}(\s*of\s*\d+)?)\s*$/i.test(line))
    .join('\n');
  return text.trim();
}

function splitParagraphs(text) {
  const lines = text.split('\n');
  const blocks = [];
  let paragraph = '';
  let paragraphHeadingId = null;

  const flush = () => {
    const value = paragraph.trim();
    if (value) blocks.push({ type: 'paragraph', text: value, headingId: paragraphHeadingId });
    paragraph = '';
  };

  const headings = [];
  let currentHeading = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (isHeading(line)) {
      flush();
      const heading = { type: 'heading', text: cleanHeading(line), raw: line, id: headings.length };
      headings.push(heading);
      blocks.push(heading);
      currentHeading = heading.id;
      paragraphHeadingId = currentHeading;
      continue;
    }
    if (isListLine(line)) {
      flush();
      blocks.push({ type: 'paragraph', text: stripListMarker(line), headingId: currentHeading, list: true });
      continue;
    }
    if (paragraph && paragraph.length > 0) {
      paragraph = joinLine(paragraph, line);
    } else {
      paragraph = line;
      paragraphHeadingId = currentHeading;
    }
    if (line.length > 60 && /[。！？.!?]$/.test(line)) {
      flush();
    }
  }
  flush();
  return { blocks, headings };
}

function splitSentences(paragraph) {
  let segmenter = null;
  try {
    segmenter = new Intl.Segmenter('zh-Hans', { granularity: 'sentence' });
  } catch {
    segmenter = null;
  }
  const parts = segmenter
    ? [...segmenter.segment(paragraph)].map((item) => item.segment)
    : paragraph.split(/(?<=[。！？!?；;])\s*/);
  return parts
    .map((part) => part.trim())
    .filter((part) => part.length >= 6)
    .map((part) => (/[。！？!?]$/.test(part) ? part : `${part}。`));
}

function trimTo(text, max) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function cleanDefinitionTerm(term) {
  return term
    .replace(/^[「『“"'(（【\s]+/, '')
    .replace(/[」』”"')）】\s]+$/, '')
    .replace(/^(所謂的?|所谓的?)/, '')
    .trim();
}

const BAD_TERM_START = /^(這|这|那|它|他|她|其|此|我|你|我們|我们|你們|你们|他們|他们|因此|所以|但是|但|如果|當|当|若|由於|由于|因為|因为|例如|譬如|即|就是)/;

function extractDefinitions(sentences) {
  const definitions = [];
  const seen = new Set();
  for (const sentence of sentences) {
    let term = '';
    let definition = '';
    const zh = sentence.match(/^(.{2,28}?)(?:是指|指的是|是|即|就是|定義為|定义为|稱為|称为|叫做)(.{6,190})$/);
    const en = sentence.match(/^(.{2,60}?)\s+(?:is|are|refers to|means|is defined as)\s+(.{6,220})$/i);
    if (zh) {
      term = cleanDefinitionTerm(zh[1]);
      definition = zh[2].trim();
    } else if (en && LATIN_RE.test(en[1])) {
      term = cleanDefinitionTerm(en[1]);
      definition = en[2].trim();
    } else {
      continue;
    }
    if (!term || term.length > 26) continue;
    if (/[，。；！？、,;!?]/.test(term)) continue;
    if (BAD_TERM_START.test(term)) continue;
    if (/^(它|他|她|這|这|那|其|此)$/.test(term)) continue;
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    definitions.push({
      term,
      definition: trimTo(definition.replace(/[。；;]$/, ''), 180) + '。',
      kind: 'definition',
    });
    if (definitions.length >= 8) break;
  }
  return definitions;
}

function sentenceScore(sentence, keywords, index, total) {
  let score = 0;
  for (const keyword of keywords) {
    if (sentence.includes(keyword)) score += keyword.length >= 3 ? 2.4 : 1.6;
  }
  if (SENTENCE_CUES.test(sentence)) score += 2.2;
  if (/\d/.test(sentence)) score += 0.8;
  if (index < total * 0.25) score += 1.6;
  if (sentence.length >= 22 && sentence.length <= 150) score += 1.1;
  if (sentence.length > 220) score -= 1.5;
  if (EXAMPLE_CUES.test(sentence)) score -= 3;
  if (/[？?]$/.test(sentence)) score -= 1.2;
  return score;
}

function dedupeSentences(sentences, limit) {
  const picked = [];
  for (const sentence of sentences) {
    const normalized = sentence.replace(/[^\u3400-\u9fffA-Za-z0-9]/g, '');
    const isDuplicate = picked.some((other) => {
      const otherNorm = other.replace(/[^\u3400-\u9fffA-Za-z0-9]/g, '');
      if (otherNorm === normalized) return true;
      if (!normalized || !otherNorm) return false;
      if (otherNorm.includes(normalized) || normalized.includes(otherNorm)) return true;
      const setA = new Set(normalized.split(''));
      const setB = new Set(otherNorm.split(''));
      let common = 0;
      for (const char of setA) if (setB.has(char)) common += 1;
      return common / Math.max(setA.size, setB.size) > 0.78;
    });
    if (!isDuplicate) picked.push(sentence);
    if (picked.length >= limit) break;
  }
  return picked;
}

function extractFormulas(paragraphs) {
  const formulas = [];
  const seen = new Set();
  for (const paragraph of paragraphs) {
    const text = paragraph.replace(/^[-•*·]\s*/, '').trim();
    if (text.length > 170 || text.length < 4) continue;
    if (!/(=|≈|∝|→|->|=>|⇌)/.test(text)) continue;
    if (!/[\dA-Za-z\u3400-\u9fff√π∑∫²³⁺⁻]/.test(text)) continue;
    if (/\b(https?:\/\/|www\.)\b/i.test(text)) continue;
    const key = text.replace(/\s+/g, ' ');
    if (seen.has(key)) continue;
    seen.add(key);
    formulas.push(text);
    if (formulas.length >= 8) break;
  }
  return formulas;
}

function shortLabel(text, max = 26) {
  const cleaned = text.replace(/[。；;]$/, '').trim();
  return trimTo(cleaned, max);
}

export function detectLanguage(text) {
  const cjk = (text.match(/[\u3400-\u9fff]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return cjk >= latin * 0.6 ? 'zh' : 'en';
}

export function buildMarkdown(note) {
  const lines = [`# ${note.title}`, ''];
  if (note.summary) {
    lines.push(`> ${note.summary}`, '');
  }
  const meta = [note.subjectName, note.form, note.topicName].filter(Boolean).join(' · ');
  if (meta) lines.push(`**${meta}**`, '');
  for (const section of note.sections || []) {
    lines.push(`## ${section.title}`, '');
    if (section.type === 'mindmap' && section.branches) {
      lines.push(`- **${section.root}**`);
      for (const branch of section.branches) {
        lines.push(`  - **${branch.label}**`);
        for (const item of branch.items || []) lines.push(`    - ${item}`);
      }
      lines.push('');
      continue;
    }
    if (section.items) {
      for (const item of section.items) {
        if (typeof item === 'string') {
          lines.push(`- ${item}`);
        } else if (section.type === 'concepts') {
          lines.push(`- **${item.term}**：${item.definition}`);
        } else if (section.type === 'formulas') {
          lines.push(`- **${item.label || '公式'}**：\`${item.formula || item}\`${item.note ? ` — ${item.note}` : ''}`);
        } else if (section.type === 'flashcards') {
          lines.push(`- **Q：** ${item.q}  `);
          lines.push(`  **A：** ${item.a}`);
        } else {
          lines.push(`- ${Object.values(item).filter(Boolean).join('：')}`);
        }
      }
    }
    lines.push('');
  }
  if (note.keywords?.length) {
    lines.push(`**关键词：** ${note.keywords.join('、')}`, '');
  }
  lines.push('---', '', '由 知序 StudyDesk 整理。题库为 DSE/HKCEE 风格改编练习，非考评局官方原文。');
  return lines.join('\n');
}

export function generateLocalNote({
  text,
  title = '',
  subject = { code: 'chi', name: '中国语文' },
  topic = { name: '综合整理' },
  form = 'S4',
  filename = '',
}) {
  const cleaned = normalizeText(text);
  if (cleaned.length < 12) {
    throw new Error('可整理的文字太少，请至少输入一两段笔记或上传包含文字的文件。');
  }

  const bounded = cleaned.slice(0, 60000);
  const { blocks, headings } = splitParagraphs(bounded);
  const paragraphs = blocks.filter((block) => block.type === 'paragraph').map((block) => block.text);
  const sentences = [];
  for (const paragraph of paragraphs) {
    for (const sentence of splitSentences(paragraph)) sentences.push(sentence);
  }
  const uniqueSentences = [...new Set(sentences)];
  const keywords = scoreTerms(`${headingText(headings)}\n${bounded}`, subject.code);
  const definitions = extractDefinitions(uniqueSentences);
  const formulas = extractFormulas(cleaned.split('\n'));
  const pitfalls = uniqueSentences.filter((sentence) => PITFALL_CUES.test(sentence)).slice(0, 6);
  const examples = uniqueSentences.filter((sentence) => EXAMPLE_CUES.test(sentence)).slice(0, 4);

  const ranked = uniqueSentences
    .map((sentence, index) => ({ sentence, score: sentenceScore(sentence, keywords, index, uniqueSentences.length) }))
    .filter((item) => item.score > 0.4)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.sentence);
  let keypoints = dedupeSentences(ranked, 9);
  if (keypoints.length < 3) {
    keypoints = dedupeSentences(uniqueSentences.filter((s) => s.length >= 12), 5);
  }

  // 定义不足时，用关键词所在句子作为「文本用法」；已用于定义其他词的句子不再复用。
  if (definitions.length < 3) {
    const usedContext = new Set(definitions.map((item) => item.definition));
    const definitionBodies = definitions.map((item) => item.definition.replace(/。$/, ''));
    for (const keyword of keywords) {
      if (definitions.some((item) => item.term === keyword)) continue;
      const context = uniqueSentences.find((sentence) => {
        if (!sentence.includes(keyword) || sentence.length > 170) return false;
        const body = trimTo(sentence, 170);
        if (usedContext.has(body)) return false;
        return !definitionBodies.some((definition) => sentence.includes(definition) || definition.includes(body));
      });
      if (context) {
        const definition = trimTo(context, 170);
        definitions.push({ term: keyword, definition, kind: 'context' });
        usedContext.add(definition);
      }
      if (definitions.length >= 5) break;
    }
  }

  const displayTitle = (title || filename || headings[0]?.text || `${topic.name} · 整理笔记`).replace(/\.(txt|md|docx|pdf|pptx|csv|png|jpe?g)$/i, '').trim();

  const mindmapBranches = buildMindmap(headings, blocks, keywords, keypoints);
  const objectives = [
    `能用自己的话说明「${topic.name}」的核心概念与关键词。`,
    formulas.length
      ? `能整理并应用本节的 ${formulas.length} 条公式 / 反应式。`
      : '能列出本节的关键步骤、条件与例子。',
    '能辨认常见陷阱，并完成相关 DSE / HKCEE 题型。',
    '能用 3 句话向同学复述本节重点，并自测一次。',
  ];
  const pitfallsFinal =
    pitfalls.length >= 2
      ? pitfalls
      : [
          ...pitfalls,
          '作答前先圈出题目中的限定词（如「最」「除了」「不正确」），再判断。',
          `把「${keywords[0] || topic.name}」与「${keywords[1] || '相关概念'}」做成对照表，避免只背定义。`,
        ].slice(0, 5);

  const flashcards = [];
  for (const definition of definitions.slice(0, 4)) {
    flashcards.push({ q: `什么是「${definition.term}」？`, a: definition.definition });
  }
  for (const formula of formulas.slice(0, 2)) {
    flashcards.push({ q: `写出：${shortLabel(formula, 30)}`, a: formula });
  }
  if (flashcards.length < 3) {
    flashcards.push({ q: '本节最重要的三个关键词是什么？', a: keywords.slice(0, 3).join('、') || topic.name });
  }

  const summaryBase = keypoints.slice(0, 2).join(' ');
  const summary = trimTo(summaryBase || `${topic.name} 的重点整理。`, 210);
  const examHints = [
    ...(SUBJECT_EXAM_HINTS[subject.code] || ['先写定义，再举例，最后回到题目问法。']),
    '时间分配：先做有把握的题，再回头处理长题；每题最后检查单位与问法。',
  ];

  const sectionList = [
    { type: 'mindmap', title: '知识脉络', root: topic.name, branches: mindmapBranches },
    { type: 'objectives', title: '学习目标', items: objectives },
    { type: 'concepts', title: '核心概念', items: definitions.slice(0, 8) },
    { type: 'keypoints', title: '重点整理', items: keypoints },
    formulas.length ? { type: 'formulas', title: '公式与关键表述', items: formulas } : null,
    { type: 'pitfalls', title: '易错提醒', items: pitfallsFinal },
    examples.length ? { type: 'examples', title: '例子与实验', items: examples } : null,
    { type: 'exam', title: 'DSE 作答框架', items: examHints },
    { type: 'flashcards', title: '自测闪卡', items: flashcards },
  ].filter(Boolean);

  const stats = {
    chars: cleaned.length,
    readingMinutes: Math.max(1, Math.ceil(cleaned.length / 380)),
    paragraphs: paragraphs.length,
    headings: headings.length,
    definitions: definitions.length,
    formulas: formulas.length,
    sentences: uniqueSentences.length,
  };

  let coverage = 18;
  coverage += Math.min(26, cleaned.length / 70);
  coverage += Math.min(16, headings.length * 3);
  coverage += Math.min(16, definitions.length * 2.5);
  coverage += Math.min(12, formulas.length * 2.5);
  coverage += Math.min(8, keypoints.length);
  coverage += examples.length ? 3 : 0;
  if (cleaned.length < 120) coverage = Math.min(coverage, 55);
  coverage = Math.max(20, Math.min(98, Math.round(coverage)));

  return {
    title: displayTitle || '未命名笔记',
    summary,
    sections: sectionList,
    keywords,
    coverage,
    stats,
    engine: 'local',
  };
}

function headingText(headings) {
  return headings.map((heading) => heading.text).join(' ');
}

function buildMindmap(headings, blocks, keywords, keypoints) {
  if (headings.length >= 2) {
    const branches = [];
    for (const heading of headings.slice(0, 4)) {
      const blockSentences = blocks
        .filter((block) => block.type === 'paragraph' && block.headingId === heading.id)
        .flatMap((block) => splitSentences(block.text));
      const local = keywords.filter((keyword) => blockSentences.some((sentence) => sentence.includes(keyword))).slice(0, 3);
      const items = local.length
        ? local
        : blockSentences.slice(0, 2).map((sentence) => shortLabel(sentence, 18));
      branches.push({ label: shortLabel(heading.text, 18), items: items.length ? items : ['待补充'] });
    }
    return branches;
  }
  const chunkSize = Math.max(2, Math.ceil(keywords.length / 3));
  return [
    { label: '核心概念', items: keywords.slice(0, chunkSize) },
    { label: '重点结论', items: keypoints.slice(0, 3).map((sentence) => shortLabel(sentence, 20)) },
    { label: '应用检查', items: ['定义', '例子', '常见陷阱'] },
  ].filter((branch) => branch.items.length);
}

export { SUBJECTS };
