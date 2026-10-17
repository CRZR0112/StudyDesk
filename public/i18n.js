// 轻量 i18n：中文模板 + 英文词典 + DOM 文本翻译。
// 只翻译界面，不翻译笔记正文、题目、选项、科目名等内容。
const STORAGE_KEY = 'zhixu.lang';
let current = 'zh';
try {
  current = localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'zh';
} catch {
  current = 'zh';
}

export const ENGLISH = {
  // shell
  '总览': 'Overview',
  '笔记库': 'Notes',
  '题库练习': 'Question Bank',
  '学科模块': 'Subjects',
  '设置与数据': 'Settings',
  '整理新笔记': 'New note',
  '我的学科': 'My subjects',
  '全部': 'All',
  '搜索笔记、课题、关键词…': 'Search notes, topics, keywords…',
  'OCR 就绪': 'OCR ready',
  'AI 增强已开启': 'AI enabled',
  '开始作答': 'Start',
  '改编': 'Adapted',
  '原卷风格': 'Original style',
  '开始归纳': 'Start',
  '搜索': 'Search',
  '筛选': 'Filter',
  '保存': 'Save',
  '保存档案': 'Save profile',
  '保存选科': 'Save subjects',
  '保存 AI 配置': 'Save AI settings',
  '取消': 'Cancel',
  '关闭': 'Close',
  '删除': 'Delete',
  '返回笔记库': 'Back to notes',
  '示范': 'Sample',
  '我的笔记': 'My notes',
  '示范笔记': 'Sample notes',
  '本地引擎': 'Local engine',
  'Ollama 英文': 'Ollama English',
  '你还没有自己的笔记': 'No notes of your own yet',
  '从一段课堂笔记开始；系统预置的示范笔记在「示范笔记」里。': 'Start with a piece of class notes. Built-in examples live under “Sample notes”.',
  '换个关键词或清除筛选；也可以直接整理一份新的材料。': 'Try another keyword, clear filters, or organize new material.',
  '全部年级': 'All forms',
  '全部来源': 'All sources',
  '复制': 'Copy',
  '复制地址': 'Copy address',
  '练习': 'Practice',
  '整理': 'Organize',
  '查看全部': 'View all',

  // auth
  '登录': 'Log in',
  '注册': 'Sign up',
  '登录你的学习台': 'Log in to your desk',
  '账号只保存在这台电脑的 SQLite 数据库里': 'Your account only lives in this computer’s SQLite database.',
  '账号只保存在这台电脑的 SQLite 数据库里。': 'Your account only lives in this computer’s SQLite database.',
  '整理笔记、关联真题、按自己的选科建立学习台。每个账号的笔记与练习记录独立保存。':
    'Organize notes, link practice, and build a desk around your own electives. Notes and attempts are isolated per account.',
  '文字 / 文件 / 图片 OCR': 'Text / files / image OCR',
  'DSE / HKCEE 风格练习': 'DSE / HKCEE-style practice',
  '本地 SQLite，账号隔离': 'Local SQLite, isolated accounts',
  '下一步选择你实际修读的科目。': 'Next, choose the subjects you actually take.',
  '界面语言 / Language': 'Interface language',
  '切换界面语言；笔记与题目内容保留原文。': 'Switches the interface only; notes and questions keep their original language.',
  '用户名': 'Username',
  '例如：anni2027': 'e.g. anni2027',
  '密码': 'Password',
  '至少 6 位': 'At least 6 characters',
  '正在登录…': 'Logging in…',
  '首次使用？先创建一个账号；原有示范笔记会保留。': 'First time? Create an account. Sample notes stay available.',
  '忘记密码 / 用户名？': 'Forgot password or username?',
  '用恢复码找回账号': 'Recover your account',
  '恢复码在注册成功时显示，也可登录后在「设置 → 账号安全」重新生成。它会同时定位用户名。': 'The recovery code is shown after registration and can be regenerated in Settings → Account security. It also identifies your username.',
  '恢复码': 'Recovery code',
  '目标 DSE 年份': 'Target DSE year',
  '未定 / Undecided': 'Undecided',
  '这会永久删除这个账号的全部笔记、附件、动态与设置，无法恢复；示范笔记和别人账号不受影响。': 'This permanently deletes all notes, attachments, activity and settings for this account. It cannot be undone. Sample notes and other accounts are unaffected.',
  '恢复码用于忘记密码或用户名时重置。生成后旧恢复码立即失效。': 'Use the recovery code to reset a forgotten password or username. Generating a new one invalidates the old code.',
  '新密码': 'New password',
  '确认新密码': 'Confirm new password',
  '重置密码': 'Reset password',
  '返回登录': 'Back to login',
  '恢复码只在本地校验；重置后旧密码和旧会话立即失效。': 'The recovery code is checked locally; the old password and sessions stop working immediately after reset.',
  '账号安全': 'Account security',
  '生成恢复码': 'Generate recovery code',
  '注销账号': 'Delete account',
  '当前密码': 'Current password',
  '输入 DELETE 确认': 'Type DELETE to confirm',
  '永久注销': 'Delete permanently',
  '账号已注销。': 'Account deleted.',
  '这串恢复码只显示一次。请保存在密码管理器、备忘录或纸上；忘记密码/用户名时用它重置。重新生成会让旧恢复码失效。': 'This recovery code is shown only once. Save it in a password manager, notes or on paper; use it if you forget your password or username. Regenerating invalidates the old code.',
  '密码已重置，请保存新的恢复码': 'Password reset. Save your new recovery code.',
  '先建立你的账号': 'Create your account',
  '下一步选择你实际修读的科目': 'Next, choose the subjects you actually take.',
  '显示名称': 'Display name',
  '例如：阿明': 'e.g. Ming',
  '确认密码': 'Confirm password',
  '再输入一次': 'Type it again',
  '年级': 'Form',
  '目标': 'Goal',
  '例如：2027 DSE': 'e.g. 2027 DSE',
  '下一步：选择科目': 'Next: choose subjects',
  '你修读哪些科目': 'Which subjects do you take?',
  '你修读哪些科目？': 'Which subjects do you take?',
  '中三以核心科为主，可保留你学校有开的科目。': 'S3 is core-heavy; keep the subjects your school offers.',
  '核心科已锁定；选修科请选择 2–5 门，M1 / M2 也在列表中。': 'Core subjects are locked. Choose 2–5 electives, including M1 / M2 if you take them.',
  '修改资料': 'Edit details',
  '核心科目': 'Core subjects',
  '必修，自动加入': 'Required, added automatically',
  '学校科目': 'School subjects',
  '选修科目': 'Electives',
  '至少保留 3 科总计': 'Keep at least 3 in total',
  '上一步': 'Back',
  '正在创建…': 'Creating…',
  '创建账号': 'Create account',
  '注册后可在「设置」中修改年级、选科与界面语言。': 'You can change form, subjects and language later in Settings.',
  '请输入用户名和密码。': 'Enter your username and password.',
  '用户名或密码不正确。': 'Incorrect username or password.',
  '这个用户名已经被注册。': 'That username is already taken.',
  '请填写显示名称。': 'Enter a display name.',
  '密码至少 6 位。': 'Password must be at least 6 characters.',
  '两次输入的密码不一致。': 'The two passwords do not match.',
  '用户名需为 3–24 位英文、数字、下划线或连字符。': 'Username must be 3–24 letters, numbers, underscores or hyphens.',
  '中三请至少保留中国语文、英国语文、数学，共 3 科。': 'Keep at least Chinese, English and Mathematics (3 subjects).',
  '请选择 2–5 门选修科（可包括 M1 / M2）。': 'Choose 2–5 electives (M1 / M2 allowed).',
  '退出登录': 'Log out',
  '账号已创建': 'Account created',
  '更新学习档案': 'Profile updated',
  '账号': 'Account',
  '学习档案': 'Study profile',
  '我的选科': 'My subjects',
  '学科覆盖': 'Subjects covered',
  '平均完整度': 'Average coverage',
  '今日复习': 'Today’s review',
  '相关视频': 'Related videos',
  '客服': 'Support',
  '微信客服': 'WeChat support',
  '微信扫码添加，或复制微信号': 'Scan the WeChat QR code, or copy the WeChat ID.',
  '复制微信号': 'Copy WeChat ID',
  '微信号已复制，去微信添加。': 'WeChat ID copied. Open WeChat to add it.',
  '在线时间不固定；留言后 24 小时内回复。': 'Online hours vary; messages are usually answered within 24 hours.',
  '检测到本地模型端点；无需 API Key，费用为 0（只消耗本机算力）。局域网内其他设备通过本服务器调用这台电脑的 Ollama，手机无需安装模型；主机休眠或 Ollama 关闭时不可用。': 'Local model endpoint detected: no API key and no API fee, only this computer’s compute. Other devices on the LAN use this host through the server; the phone does not need the model. It is unavailable when the host sleeps or Ollama stops.',
  '按这个课题搜索讲解视频，结果会在新标签打开。': 'Search explainer videos for this topic; results open in a new tab.',
  'YouTube 搜索': 'YouTube search',
  'Bing 视频': 'Bing videos',
  '未整理': 'Not organized',
  '从第一份笔记开始': 'Start with your first note',
  '继续阅读': 'Continue reading',
  '整理第一份': 'Create your first note',
  '结构化概念、重点与闪卡': 'Structured concepts, key points and flashcards',
  '全部题库': 'All questions',
  '题库练习': 'Question bank',
  '外部题库': 'External question banks',
  '添加外部题库': 'Add an external question bank',
  '还没有外部题库；下面添加第一个。': 'No external banks yet. Add the first one below.',
  '打开': 'Open',
  '题库链接已添加。': 'Question-bank link added.',
  '外部题库资源': 'External question-bank resource',
  '只保存链接与说明，不抓取对方网站内容；需要登录的 SharePoint 链接请先确认自己能打开。': 'Only the link and description are stored; the other site is not scraped. Make sure you can open SharePoint links that require a school login.',
  '例如：DSE Physics Question Bank': 'e.g. DSE Physics Question Bank',
  '需要学校账号 / 包含历年题 / 只读': 'School login required / past papers / read-only',
  '界面语言': 'Interface language',
  '课题': 'Topic',
  '笔记': 'Notes',
  '练习题': 'Questions',
  '中文': '中文',
  '账号、笔记与答题记录都只保存在这台电脑的 SQLite 数据库里。': 'Account, notes and attempts stay in this computer’s SQLite database.',
  '用于总览问候与 DSE 倒计时。': 'Used for the dashboard greeting and DSE countdown.',
  '称呼': 'Name',
  '当前年级': 'Current form',
  '核心科自动保留；选修科可选 2–5 门，M1 / M2 在列表中。改年级后请重新保存选科。': 'Core subjects stay. Choose 2–5 electives, including M1 / M2. Re-save subjects after changing form.',

  // dashboard
  '早晨': 'Good morning',
  '午安': 'Good afternoon',
  '晚上好': 'Good evening',
  '天后开考': 'days to exams',
  '把今天的输入，': 'Turn today’s input ',
  '变成考场的输出。': 'into exam-day output.',
  '粘贴一段笔记、上传讲义 PDF，或直接拍下课本——知序会替你拆成概念、重点、公式、易错点与自测闪卡，再关联 DSE / HKCEE 风格练习。':
    'Paste notes, upload a PDF handout, or photograph a textbook. StudyDesk turns it into concepts, key points, formulas, pitfalls and flashcards, then links DSE / HKCEE-style practice.',
  '整理一份新材料': 'Organize new material',
  '份已整理笔记': 'notes organized',
  '道题库练习': 'practice questions',
  '从哪里开始？': 'Where do you want to start?',
  '选择一种输入方式，30 秒得到结构。': 'Pick an input type and get structure in 30 seconds.',
  '粘贴文字': 'Paste text',
  '课堂笔记、网上资料': 'Class notes, web pages',
  '上传文件': 'Upload file',
  'PDF / DOCX / PPTX': 'PDF / DOCX / PPTX',
  '拍下图片': 'Take a photo',
  'OCR 自动识字': 'Automatic OCR',
  '按学科开始': 'Start by subject',
  '手机 / 平板也能用': 'Use it on your phone',
  '连同一个 Wi-Fi，打开': 'On the same Wi-Fi, open',
  '已整理笔记': 'Notes organized',
  '题库练习': 'Question bank',
  '练习正确率': 'Accuracy',
  '连续整理': 'Streak',
  '覆盖': 'Across',
  '个学科': 'subjects',
  'DSE / HKCEE 风格，含详解': 'DSE / HKCEE style, with explanations',
  '从今日一题开始': 'Start with today’s question',
  '平均完整度': 'Average coverage',
  '继续整理': 'Continue',
  '最近更新的笔记，接着上次的脉络往下走。': 'Recently updated notes; pick up where you left off.',
  '全部笔记': 'All notes',
  '按学科进入': 'Browse by subject',
  '每个学科都是独立模块，课题可随考纲继续扩展。': 'Each subject is a module; topics can grow with the syllabus.',
  'DAILY PRACTICE · 今日一题': 'DAILY PRACTICE',
  '今日一题': 'Question of the day',
  '开始作答': 'Start',
  '最近动态': 'Recent activity',
  '还没有笔记': 'No notes yet',
  '从一段课堂笔记开始，知序会替你整理成可复习的结构。': 'Start with a piece of class notes; StudyDesk will structure it for revision.',
  '整理第一份': 'Create the first one',
  '还没有动态': 'No activity yet',
  '还没有笔记': 'No notes yet',

  // notes
  '笔记库': 'Note library',
  '所有整理结果都在这里。按学科、年级或关键词筛选，随时回到某一条脉络。': 'Every organized note lives here. Filter by subject, form or keyword.',
  '搜索标题、摘要、关键词…': 'Search title, summary, keywords…',
  '份笔记': 'notes',
  '没有匹配的笔记': 'No matching notes',
  '换个关键词或清除筛选；也可以直接整理一份新的材料。': 'Try another keyword, clear filters, or organize new material.',

  // subjects
  '学科模块': 'Subjects',
  '16 个学科、174 个课题，按中三至中六分年级组织。每个模块都有独立笔记与题库，可继续扩充。':
    '16 subjects and 174 topics, organized from S3 to S6. Each module has its own notes and question bank.',
  '全部': 'All',
  '初中': 'Junior',
  '高中': 'Senior',
  '个课题': 'topics',
  '笔记': 'notes',
  '练习题': 'questions',
  '整理这一科': 'Organize this subject',
  '学科资源': 'Subject resources',
  '先看评核大纲，再用真题检查自己的理解。': 'Read the assessment framework, then check your understanding with past-paper style questions.',
  '进入本科题库': 'Open this subject’s question bank',
  '历年试题': 'Past papers',
  '官方 Past Papers 入口': 'Official past-paper archive',
  '官方资源入口': 'Official resources',
  '题库为改编练习，历年原文请以考评局发布为准。': 'The bank contains adapted practice. Use HKEAA for official papers.',

  // capture
  '整理新材料': 'Organize new material',
  '把原始材料交给知序：先提取文字，再拆成概念、重点、公式、易错点与自测闪卡，最后关联相关真题。':
    'Give StudyDesk the raw material. It extracts text, builds concepts, key points, formulas, pitfalls and flashcards, then links practice.',
  '输入材料': 'Input',
  '文字、文件、图片三选一。图片会调用本机 OCR；PDF 只提取文字层。': 'Pick text, a file or an image. Images use local OCR; PDFs use the text layer.',
  '学科': 'Subject',
  '课题': 'Topic',
  '笔记标题': 'Note title',
  '例如：光合作用 · 光反应与卡尔文循环': 'e.g. Photosynthesis · light reactions',
  '粘贴文字': 'Paste text',
  '上传文件': 'Upload file',
  '图片 OCR': 'Image OCR',
  '把课堂笔记、课本段落或网上资料粘贴在这里…': 'Paste class notes, textbook passages or web material here…',
  '填入示例文本': 'Fill sample text',
  '拖入文件，或点击选择': 'Drop a file, or click to choose',
  '支持 .txt / .md / .docx / .pptx / .xlsx / .pdf，单文件不超过 24 MB': 'Supports .txt / .md / .docx / .pptx / .xlsx / .pdf, up to 24 MB',
  '拖入图片，或点击拍照 / 选择': 'Drop an image, or click to take a photo',
  '支持 PNG / JPG / WebP。图片会先保存为附件，再用 Windows OCR 识别文字；识别结果可回到笔记中校对。':
    'Supports PNG / JPG / WebP. The image is saved, then Windows OCR extracts text; proofread it in the note.',
  '开始归纳': 'Start organizing',
  '材料只存在本机 SQLite': 'Stored only in local SQLite',
  '你会得到什么': 'What you get',
  '不是简单摘要，而是一份可以直接温习的「学习包」。': 'Not just a summary — a revision-ready study pack.',
  '知识脉络': 'Knowledge map',
  '把材料拆成 3–4 条分支': 'Split the material into 3–4 branches',
  '概念与公式': 'Concepts & formulas',
  '术语定义、反应式、关键表述': 'Definitions, equations, key statements',
  '重点与陷阱': 'Key points & pitfalls',
  '按考点密度排序，标出易错处': 'Ranked by exam relevance; mistakes flagged',
  '自测闪卡': 'Flashcards',
  '点击翻面，先回忆再看答案': 'Flip to recall before checking',
  '关联真题': 'Linked practice',
  '同课题 DSE / HKCEE 风格练习': 'DSE / HKCEE-style practice on the same topic',
  '整理引擎': 'Engine',
  '当前使用本地归纳引擎：离线、可预测、不上传材料。可在设置中接入 OpenAI 兼容接口。':
    'Using the local engine: offline, predictable, no uploads. You can connect an OpenAI-compatible endpoint in Settings.',
  '配置引擎': 'Configure engine',

  // note detail
  '完整度': 'Coverage',
  '结构完整': 'Well structured',
  '可继续补充': 'Can be expanded',
  '材料偏少': 'Thin material',
  '本页目录': 'On this page',
  '关键词': 'Keywords',
  '原始材料': 'Source material',
  '示范笔记': 'Sample note',
  '只读': 'read only',
  '导出': 'Export',
  '导出 Markdown': 'Export Markdown',
  '打印 / PDF': 'Print / PDF',
  '改标题': 'Rename',
  '重新归纳': 'Regenerate',
  '删除': 'Delete',
  '分钟阅读': 'min read',
  '个板块': 'sections',
  '示范笔记 · 只读': 'Sample note · read only',
  '同科笔记': 'More in this subject',
  '查看提取文字': 'View extracted text',
  'OCR 识别，建议对照原图校对': 'OCR text; proofread against the image',
  '学习目标': 'Learning objectives',
  '核心概念': 'Core concepts',
  '重点整理': 'Key points',
  '公式与反应式': 'Formulas & equations',
  '公式': 'Formulas',
  '易错提醒': 'Common mistakes',
  '例子与实验': 'Examples & experiments',
  '例子': 'Examples',
  '例题': 'Examples',
  'DSE 作答框架': 'DSE answer framework',
  'DSE 考法与作答框架': 'DSE answer framework',
  '自测闪卡': 'Flashcards',
  '文本用法': 'in context',
  '公式 / 关键表述': 'Formula / key statement',

  // questions
  '按 DSE / HKCEE 题型与考纲改编，附答案、解释与难度标记。历年官方原文请使用考评局 Past Papers。':
    'Adapted from DSE / HKCEE question styles and the syllabus, with answers, explanations and difficulty. Use HKEAA for official papers.',
  '搜索题干、知识点…': 'Search stems, concepts…',
  '道题': 'questions',
  '这个筛选下还没有题目': 'No questions for this filter',
  '题库会随复习进度继续扩充；先试试其他学科或清除筛选。': 'The bank keeps growing. Try another subject or clear filters.',
  '说明：本页题目按公开考纲与历年题型重新撰写，属 DSE / HKCEE 风格改编练习，并非香港考评局官方原文；年份与试卷标签用于标示参考年份。':
    'Note: these questions are rewritten from the public syllabus and past-paper styles. They are adapted practice, not official HKEAA papers.',
  '查看答案': 'Check answer',
  '答对了': 'Correct',
  '再检查一次': 'Check again',
  '参考答案': 'Reference answer',
  '先不做': 'Not now',
  '再来一题': 'Another question',
  '写出你的答案或关键步骤…': 'Write your answer or key steps…',
  '自我评分': 'Self-grade',
  '还需复习': 'Needs review',

  // settings misc
  '设置与数据': 'Settings & data',
  '你的笔记、题库与该 SQLite 数据库都保存在本机。这里可以配置可选 AI、导出数据，以及查看后续迭代方向。':
    'Notes, questions and this SQLite database stay on this machine. Configure optional AI, export data, and see the roadmap.',
  'AI 增强（可选）': 'AI enhancement (optional)',
  '兼容 OpenAI Chat Completions 的接口。留空则只使用本地归纳引擎，材料不会离开本机。':
    'OpenAI Chat Completions compatible. Leave empty to stay local; material never leaves this machine.',
  '启用 AI 润色': 'Enable AI polish',
  '失败时自动回退本地引擎': 'Falls back to the local engine on failure',
  'Base': 'Base URL',
  '模型': 'Model',
  'API Key': 'API Key',
  '清除已保存的': 'Clear saved',
  '清除已保存的 Key': 'Clear saved key',
  '测试连接': 'Test connection',
  '数据与备份': 'Data & backup',
  'SQLite 数据库 + 上传附件。定期导出 JSON 备份，换设备或未来 App 可直接迁移。':
    'SQLite + uploaded files. Export JSON regularly for migration or the future app.',
  '数据库': 'Database',
  '附件数': 'Files',
  '题目': 'Questions',
  '导出 JSON 备份': 'Export JSON backup',
  '安装到桌面': 'Install app',
  '位置': 'Location',
  '远程访问': 'Remote access',
  '不在同一个 Wi-Fi 时，用 Tailscale 连回这台电脑；不要把 4173 直接映射到公网。': 'When you are away from home, use Tailscale to reach this computer. Do not expose port 4173 directly to the public internet.',
  '尚未配置远程地址。安装 Tailscale 后运行脚本，并设置': 'No remote URL configured yet. Install Tailscale, run the setup script, and set',
  'Tailscale 设置步骤': 'Tailscale setup steps',
  '远程访问仍需要账号登录；Tailscale 只负责把设备连到同一个私有网络，不绕过知序账号。': 'Remote access still requires an account login. Tailscale only joins devices to a private network; it does not bypass the StudyDesk account.',
  '局域网访问': 'LAN access',
  '手机、平板连同一个 Wi-Fi，打开下面的地址即可。电脑需要保持开机，服务器窗口不能关。':
    'On the same Wi-Fi, open the address below on your phone or tablet. Keep the computer and server running.',
  '当前访问': 'Current address',
  '手机打不开？': 'Phone cannot connect?',
  '后续迭代': 'Roadmap',
  '官方资源': 'Official resources',
  '题库为改编练习，历年原文与评卷参考请以考评局为准。': 'Adapted practice; use HKEAA for official papers and marking schemes.',
  '本地优先': 'Local-first',
  '题目为按考纲重写的改编练习，不声称是考评局官方试题。': 'Questions are adapted practice, not official HKEAA papers.',

  // generic
  '正在加载…': 'Loading…',
  '正在整理': 'Organizing',
  '读取材料': 'Reading material',
  '识别文字 / 结构': 'Extracting text / structure',
  '提取概念与公式': 'Extracting concepts & formulas',
  '组织笔记结构': 'Structuring the note',
  '关联真题': 'Linking practice',
  '优先': 'Priority',
  '暂无摘要': 'No summary yet',
  '综合': 'General',
  '未整理': 'Not organized',
  '今日': 'Today',
  '本周': 'This week',
  '暂无': 'None',
  '正在准备登录…': 'Preparing sign-in…',
  '这个页面不存在，可能链接已经过期。': 'This page does not exist or the link has expired.',
  '这一步没有走通': 'Something went wrong',
  '重新加载': 'Reload',
};

export function getLang() {
  return current;
}

export function setLang(lang) {
  current = lang === 'en' ? 'en' : 'zh';
  try {
    localStorage.setItem(STORAGE_KEY, current);
  } catch {
    // 忽略隐私模式下的存储失败。
  }
  document.documentElement.lang = current === 'en' ? 'en' : 'zh-Hans';
  document.body?.classList.toggle('lang-en', current === 'en');
  return current;
}

export function t(zh, vars = {}) {
  let value = current === 'en' ? ENGLISH[zh] || zh : zh;
  for (const [key, replacement] of Object.entries(vars)) {
    value = value.replace(new RegExp(`\\{${key}\\}`, 'g'), String(replacement));
  }
  return value;
}

function translateExact(text) {
  if (current !== 'en') return text;
  const trimmed = text.trim();
  if (!trimmed) return text;
  const direct = ENGLISH[trimmed];
  if (direct) return text.replace(trimmed, direct);
  const patterns = [
    [/^已选 (\d+) \/ 2–5 门$/, '$1 of 2–5 selected'],
    [/^(\d+) 份笔记$/, '$1 notes'],
    [/^(\d+) 道题$/, '$1 questions'],
    [/^(\d+) 个课题$/, '$1 topics'],
    [/^(\d+) 道练习$/, '$1 practice questions'],
    [/^(\d+) 分钟阅读$/, '$1 min read'],
    [/^(\d+) 个板块$/, '$1 sections'],
    [/^(\d+) 分钟阅读 · (\d+) 个板块$/, '$1 min read · $2 sections'],
    [/^(\d+) 字 · (\d+) 个概念 · (\d+) 张闪卡$/, '$1 characters · $2 concepts · $3 flashcards'],
    [/^(\d+) 分$/, '$1 mark'],
    [/^(\d+) 天后开考$/, '$1 days to exams'],
    [/^距离 (\d{4}) DSE 预计开考$/, '$1 DSE expected start'],
    [/^覆盖 (\d+) 个学科$/, 'Across $1 subjects'],
    [/^已作答 (\d+) 次$/, '$1 attempts'],
    [/^平均完整度 (\d+)%$/, 'Average coverage $1%'],
    [/^完整度 (\d+)%$/, 'Coverage $1%'],
    [/^(\d+) 份已整理笔记$/, '$1 notes organized'],
    [/^(\d+) 道题库练习$/, '$1 practice questions'],
    [/^(\d+) 个概念$/, '$1 concepts'],
    [/^(\d+) 张闪卡$/, '$1 flashcards'],
    [/^(早晨|午安|晚上好)，(.+)。$/, (_, greeting, name) => `${greeting === '早晨' ? 'Good morning' : greeting === '午安' ? 'Good afternoon' : 'Good evening'}, ${name}. `],
    [/^距离 (\d{4}) DSE 预计开考$/, '$1 DSE expected start'],
    [/^(\d+) 天后开考$/, '$1 days to exams'],
    [/^香港 DSE · 中三至中六 · (v.+)$/, 'Hong Kong DSE · S3–S6 · $1'],
    [/^(整理完成|更新笔记|删除笔记|重新归纳|预置示范)：(.*)$/, (_, verb, rest) => `${({ 整理完成: 'Organized', 更新笔记: 'Updated', 删除笔记: 'Deleted', 重新归纳: 'Regenerated', 预置示范: 'Sample' })[verb]}: ${rest}`],
  ];
  for (const [pattern, replacement] of patterns) {
    if (pattern.test(trimmed)) return text.replace(trimmed, trimmed.replace(pattern, replacement));
  }
  return text;
}

const SKIP_SELECTOR =
  '.note-sections .section-body, .note-card h3, .note-card p, .note-summary, .note-hero h1, .daily-card h3, .practice-stem, .option, .source-text, .keyword, .auth-subject-copy, .topic-main, .subject-card h3, .question-main h3, .search-hero input, code, pre, textarea';

export function translateDom(root = document) {
  if (current !== 'en' || !root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || parent.closest(SKIP_SELECTOR)) continue;
    const next = translateExact(node.nodeValue);
    if (next !== node.nodeValue) node.nodeValue = next;
  }

  root.querySelectorAll('[placeholder]').forEach((element) => {
    const value = element.getAttribute('placeholder');
    const translated = translateExact(value);
    if (translated !== value) element.setAttribute('placeholder', translated);
  });
  root.querySelectorAll('[title]').forEach((element) => {
    const value = element.getAttribute('title');
    const translated = translateExact(value);
    if (translated !== value) element.setAttribute('title', translated);
  });
}

export function applyStaticI18n(root = document) {
  if (!root) return;
  root.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;
    element.textContent = t(key);
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    element.setAttribute('placeholder', t(element.dataset.i18nPlaceholder));
  });
}
