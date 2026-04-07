// ─── Adaptive Question Engine ─────────────────────────────────────────────────
const STORAGE_KEY = 'geniebuilder_engine_state';


function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { categoryScores: {}, seenIds: [], sessionCount: 0 };
  } catch { return { categoryScores: {}, seenIds: [], sessionCount: 0 }; }
}

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

export function updateEngineState(answers) {
  const state = loadState();
  state.sessionCount = (state.sessionCount || 0) + 1;
  answers.forEach(({ question, feedback }) => {
    const cat = question.cat;
    if (!state.categoryScores[cat]) {
      state.categoryScores[cat] = { totalScore: 0, attempts: 0, avgScore: 0 };
    }
    const c = state.categoryScores[cat];
    c.totalScore += feedback.score;
    c.attempts   += 1;
    c.avgScore    = Math.round(c.totalScore / c.attempts);
    const qId = question.q.slice(0, 40);
    if (!state.seenIds.includes(qId)) state.seenIds.push(qId);
  });
  saveState(state);
  return state;
}

export function getEngineStats() { return loadState(); }
export function resetEngineState() { localStorage.removeItem(STORAGE_KEY); }

export function selectAdaptiveQuestions(allQuestions, count = 5) {
  const state = loadState();
  const seen  = new Set(state.seenIds);
  const unseen = allQuestions.filter(q => !seen.has(q.q.slice(0, 40)));
  const seenQs = allQuestions.filter(q =>  seen.has(q.q.slice(0, 40)));
  const pool   = unseen.length >= count ? unseen : [...unseen, ...seenQs];

  const scored = pool.map(q => {
    const catData  = state.categoryScores[q.cat];
    const catAvg   = catData ? catData.avgScore : 50;
    const sessions = state.sessionCount || 0;
    let weight = 1.0;
    if (catAvg < 60)  weight += 2.5;
    else if (catAvg < 75) weight += 1.0;
    if (sessions < 3) {
      if (q.diff === 'Easy')   weight += 2.0;
      if (q.diff === 'Medium') weight += 1.0;
    } else if (sessions < 6) {
      if (q.diff === 'Medium') weight += 1.5;
      if (q.diff === 'Hard')   weight += 1.0;
    } else {
      if (q.diff === 'Hard')   weight += 2.0;
      if (q.diff === 'Medium') weight += 0.5;
    }
    return { q, weight };
  });

  const totalWeight = scored.reduce((s, x) => s + x.weight, 0);
  const selected = [];
  const remaining = [...scored];

  for (let i = 0; i < Math.min(count, remaining.length); i++) {
    let rand = Math.random() * remaining.reduce((s, x) => s + x.weight, 0);
    let idx  = 0;
    for (let j = 0; j < remaining.length; j++) {
      rand -= remaining[j].weight;
      if (rand <= 0) { idx = j; break; }
    }
    selected.push(remaining[idx].q);
    remaining.splice(idx, 1);
  }
  return selected;
}

// ─── Category keywords for ALL roles (smart mode scoring) ─────────────────────
const CATEGORY_KEYWORDS = {
  // Frontend
  'JavaScript':     ['closure','prototype','hoisting','event loop','promise','async','await','scope','callback','module'],
  'React':          ['component','hook','state','props','virtual dom','reconciliation','context','effect','memo','ref'],
  'CSS':            ['flexbox','grid','specificity','cascade','selector','responsive','animation','transform','pseudo','media query'],
  'TypeScript':     ['type','interface','generic','enum','decorator','inference','union','intersection','readonly','assertion'],
  'Performance':    ['optimize','cache','lazy','bundle','tree shaking','code split','render','paint','lcp','fid'],
  'Browser APIs':   ['storage','cookie','fetch','websocket','worker','canvas','geolocation','notification','intersection','mutation'],
  'PWA':            ['service worker','manifest','offline','cache api','push','install','workbox','precache','background sync'],
  'Accessibility':  ['wcag','aria','semantic','screen reader','keyboard','contrast','focus','tab order','alt text','landmark'],
  'Networking':     ['cors','http','https','tls','dns','cdn','latency','bandwidth','proxy','header'],
  'Tooling':        ['webpack','vite','babel','eslint','prettier','jest','rollup','postcss','parcel','build'],

  // Backend
  'API Design':     ['rest','graphql','endpoint','resource','idempotent','versioning','rate limit','pagination','status code','webhook'],
  'Database':       ['index','query','transaction','acid','join','aggregate','normalize','schema','migration','replication'],
  'Architecture':   ['microservice','monolith','event driven','cqrs','saga','circuit breaker','service mesh','api gateway','domain'],
  'Distributed Systems': ['cap theorem','consistency','availability','partition','consensus','raft','paxos','eventual','quorum'],
  'Security':       ['authentication','authorization','jwt','oauth','hash','encrypt','xss','csrf','injection','sanitize'],
  'Infrastructure': ['server','cloud','container','kubernetes','docker','nginx','load balancer','reverse proxy','vpc','subnet'],
  'System Design':  ['scalability','availability','reliability','throughput','latency','sharding','partition','replica','load balance','cache'],

  // AI/ML
  'Fundamentals':   ['supervised','unsupervised','reinforcement','gradient','loss','epoch','batch','feature','label','overfitting'],
  'Model Training': ['backpropagation','learning rate','regularization','dropout','batch norm','augmentation','early stopping','checkpoint'],
  'Deep Learning':  ['neural network','layer','activation','transformer','attention','cnn','rnn','lstm','encoder','decoder'],
  'Optimization':   ['sgd','adam','momentum','learning rate','convergence','loss landscape','hyperparameter','scheduler'],
  'Metrics':        ['accuracy','precision','recall','f1','auc','roc','confusion matrix','mae','rmse','perplexity'],
  'NLP':            ['token','embedding','bert','gpt','attention','transformer','language model','corpus','vocabulary','sequence'],
  'LLMs':           ['prompt','fine-tune','rag','hallucination','temperature','context window','token','inference','alignment','rlhf'],
  'Unsupervised':   ['cluster','k-means','dbscan','pca','autoencoder','anomaly','dimensionality','silhouette','centroid'],
  'Evaluation':     ['cross-validation','train test split','benchmark','baseline','ablation','holdout','stratified','bias variance'],
  'Data':           ['imbalanced','augmentation','preprocessing','normalization','feature engineering','pipeline','cleaning','labeling'],
  'Dimensionality': ['pca','tsne','umap','svd','variance','component','projection','manifold','eigenvalue'],
  'Infrastructure': ['vector database','mlops','feature store','model registry','serving','pipeline','monitoring','drift'],

  // DevOps & Cloud
  'CI/CD':          ['pipeline','jenkins','github actions','build','test','deploy','artifact','stage','trigger','webhook'],
  'Kubernetes':     ['pod','deployment','service','ingress','configmap','secret','namespace','resource','hpa','node'],
  'IaC':            ['terraform','ansible','puppet','chef','cloudformation','pulumi','idempotent','state','module','provider'],
  'Deployment':     ['blue green','canary','rolling','feature flag','rollback','zero downtime','release','staging','production'],
  'Observability':  ['metric','log','trace','alert','dashboard','prometheus','grafana','opentelemetry','jaeger','elk'],
  'Reliability':    ['slo','sli','sla','error budget','availability','uptime','mttr','mtbf','failover','redundancy'],
  'Cloud Platforms':['aws','azure','gcp','ec2','s3','lambda','vpc','iam','rds','elasticity'],
  'Serverless':     ['lambda','function','event','trigger','cold start','stateless','faas','api gateway','cloud run'],
  'Scalability':    ['horizontal','vertical','auto scale','elasticity','load balance','partition','shard','cache','cdn'],
  'Cost Management':['reserved','spot','on-demand','saving plan','rightsizing','tagging','budget','waste','optimize'],
  'Networking':     ['vpc','subnet','route table','nat','firewall','acl','peering','transit gateway','bgp','vpn'],

  // Security roles
  'Vulnerabilities':['injection','xss','csrf','overflow','deserialization','ssrf','idor','path traversal','privilege escalation'],
  'Cryptography':   ['encryption','hash','rsa','aes','ecc','certificate','pki','key exchange','tls','hmac'],
  'Authentication': ['mfa','saml','oauth','oidc','jwt','ldap','sso','password','biometric','session'],
  'Penetration Testing': ['reconnaissance','exploitation','post-exploitation','payload','vulnerability','nmap','metasploit','burp','privilege'],
  'Testing':        ['pentest','audit','scan','assessment','report','finding','cvss','remediation','scope','methodology'],
  'Monitoring':     ['siem','log','alert','event','correlation','threat','hunt','detection','telemetry','incident'],
  'Threat Intelligence': ['ioc','ioa','ttps','mitre','kill chain','threat actor','malware','campaign','attribution'],
  'Incident Response': ['triage','containment','eradication','recovery','postmortem','playbook','escalation','evidence'],
  'Threat Hunting': ['hypothesis','anomaly','baseline','lateral movement','persistence','detection','behavioral','proactive'],
  'Frameworks':     ['nist','iso27001','soc2','cis','mitre','pci dss','gdpr','cobit','stride','dread'],
  'Risk Management':['risk','threat','vulnerability','impact','likelihood','control','mitigation','residual','accept','transfer'],
  'Compliance':     ['gdpr','hipaa','pci','sox','iso','nist','audit','policy','regulation','control'],

  // SRE
  'Operations':     ['runbook','toil','oncall','escalation','rotation','capacity','alert','dashboard','postmortem'],

  // Embedded/IoT
  'RTOS':           ['preemption','scheduler','task','semaphore','mutex','interrupt','priority','tick','context switch'],
  'Protocols':      ['uart','spi','i2c','can','modbus','mqtt','coap','lorawan','zigbee','bluetooth'],
  'Memory Management': ['heap','stack','static','dynamic','fragment','leak','allocation','pointer','buffer','align'],
  'Hardware':       ['register','peripheral','gpio','adc','dac','timer','pwm','dma','clock','voltage'],
  'Power':          ['sleep','deep sleep','wakeup','current','voltage','battery','consumption','optimize','duty cycle'],
  'Firmware':       ['bootloader','ota','update','flash','eeprom','partition','signed','rollback','secure boot'],

  // Game Dev
  'Physics':        ['rigidbody','collision','raycast','force','torque','friction','constraint','simulation','broadphase'],
  'Graphics':       ['shader','vertex','fragment','texture','mesh','material','pipeline','renderpass','light','shadow'],
  'Engines':        ['unity','unreal','godot','monobehaviour','blueprint','scene','component','prefab','asset'],
  'Game Design':    ['mechanic','loop','progression','balance','player','reward','economy','difficulty','feedback'],
  'AI':             ['behavior tree','pathfinding','astar','navmesh','state machine','utility','decision','perception'],

  // Database admin
  'Indexing':       ['clustered','non-clustered','btree','hash','covering','composite','partial','include','seek','scan'],
  'Transactions':   ['acid','isolation','rollback','commit','savepoint','deadlock','lock','mvcc','serializable','phantom'],
  'Replication':    ['master','slave','primary','replica','sync','async','lag','failover','gtid','binlog'],
  'Scaling':        ['shard','partition','horizontal','read replica','write','distribute','consistent hash','range','hash'],
  'Backup':         ['full','incremental','differential','point-in-time','restore','rpo','rto','dump','snapshot'],

  // Blockchain
  'Consensus':      ['proof of work','proof of stake','validator','node','fork','finality','byzantine','nakamoto','bft'],
  'Smart Contracts':['solidity','bytecode','abi','gas','deploy','function','event','modifier','mapping','struct'],
  'Tokens':         ['erc20','erc721','erc1155','mint','burn','transfer','allowance','approve','nft','fungible'],
  'Scaling':        ['layer2','optimism','arbitrum','rollup','sidechain','channel','plasma','zk','validity proof'],

  // NLP specific (already have NLP above, add more)
  'Text Processing':['tokenize','lemmatize','stem','bpe','subword','vocabulary','oov','normalization','stopword','ngram'],
  'Transformers':   ['bert','gpt','attention head','encoder','decoder','positional encoding','pretraining','fine-tune','embedding layer'],
  'NLP Tasks':      ['ner','pos','sentiment','classification','summarization','translation','qa','relation extraction','coreference'],

  // Vision
  'CNNs':           ['convolution','filter','pooling','stride','padding','feature map','activation','batch norm','resnet','vgg'],
  'Object Detection':['yolo','rcnn','anchor','bounding box','iou','nms','map','fpn','ssd','detection head'],
  'Segmentation':   ['semantic','instance','panoptic','mask','unet','deeplab','fcn','pixel','class'],
  'Generative Models':['gan','discriminator','generator','vae','latent','diffusion','stable diffusion','adversarial','mode collapse'],
  'Video':          ['optical flow','temporal','frame','tracking','action recognition','clip','feature extraction'],

  // AI Ethics
  'Bias & Fairness':['bias','fairness','demographic','protected','disparate impact','calibration','equalized odds','group fairness'],
  'Transparency':   ['explainability','interpretability','lime','shap','feature importance','black box','audit','trust'],
  'Privacy':        ['differential privacy','federated','anonymization','pseudonymization','consent','data minimization','gdpr'],
  'Governance':     ['policy','review','accountability','oversight','documentation','model card','datasheet','ethics board'],
  'Regulation':     ['eu ai act','gdpr','nist ai','responsible ai','compliance','prohibited','high risk','conformity'],

  // Network Architecture
  'Routing':        ['bgp','ospf','eigrp','routing table','prefix','as','peering','transit','route','convergence'],
  'LAN':            ['vlan','trunk','stp','rstp','dot1q','mac','switch','port','loop','broadcast'],
  'WAN':            ['mpls','sd-wan','vpn','leased line','latency','bandwidth','qos','link','provider'],

  // AR/VR
  'Tracking':       ['slam','6dof','3dof','pose','anchor','marker','world space','drift','imu','fusion'],
  'UX':             ['comfort','motion sickness','presence','immersion','affordance','spatial','gesture','gaze','haptic'],

  // General
  'Design Principles': ['solid','dry','kiss','yagni','separation','cohesion','coupling','abstraction','encapsulation'],
  'Design Patterns': ['singleton','factory','observer','strategy','decorator','facade','adapter','command','repository'],
  'Engineering Practices': ['technical debt','code review','refactoring','documentation','testing','agile','sprint','estimation'],
  'Process':        ['workflow','methodology','agile','scrum','kanban','sprint','retrospective','planning','ceremony'],
  'Documentation':  ['readme','api doc','adr','diagram','comment','docstring','changelog','specification'],
  'Communication':  ['stakeholder','presentation','explain','non-technical','visualization','story','metric','insight'],
  'Strategy':       ['roadmap','priority','tradeoff','decision','goal','okr','milestone','alignment'],
  'Leadership':     ['team','mentor','hire','culture','process','1on1','feedback','performance','grow'],
  'Business':       ['roi','cost','revenue','risk','compliance','executive','board','stakeholder','budget'],
  'Research':       ['user research','interview','usability test','survey','persona','journey map','synthesis'],
  'Methodology':    ['bdd','tdd','ddd','design thinking','lean','six sigma','waterfall','agile','kanban'],
};

const GENERAL_KEYWORDS = [
  'because','therefore','for example','such as','however','in contrast',
  'implement','design','optimize','improve','consider','approach',
  'trade-off','benefit','drawback','use case','alternative',
];

const STRUCTURE_PATTERNS = [
  /first(ly)?[,\s]/i, /second(ly)?[,\s]/i, /finally[,\s]/i,
  /for example/i, /such as/i, /in my experience/i,
  /the reason/i, /this (means|allows|helps)/i,
];

export function adaptiveLocalScore(question, answer) {
  const words  = answer.trim().split(/\s+/).filter(Boolean);
  const wc     = words.length;
  const lower  = answer.toLowerCase();
  let score    = 0;

  // 1. Length scoring (max 25 pts)
  if (wc >= 20)  score += 10;
  if (wc >= 50)  score += 8;
  if (wc >= 100) score += 7;

  // 2. Category-specific keywords (max 30 pts)
  const catKws  = CATEGORY_KEYWORDS[question.cat] || [];
  const catHits = catKws.filter(kw => lower.includes(kw));
  score += Math.min(catHits.length * 6, 30);

  // 3. General quality indicators (max 20 pts)
  const genHits = GENERAL_KEYWORDS.filter(kw => lower.includes(kw));
  score += Math.min(genHits.length * 4, 20);

  // 4. Answer structure (max 15 pts)
  const structHits = STRUCTURE_PATTERNS.filter(p => p.test(answer));
  score += Math.min(structHits.length * 5, 15);

  // 5. Difficulty adjustment
  if (question.diff === 'Hard' && score > 50) score += 5;
  if (question.diff === 'Easy' && score < 30) score -= 5;

  score = Math.max(10, Math.min(score, 95));

  const strengths = [];
  const improvements = [];

  if (wc >= 50)            strengths.push('Well-detailed response with good depth');
  else                     improvements.push('Expand your answer with more detail (aim for 80+ words)');
  if (catHits.length >= 3) strengths.push(`Strong use of ${question.cat} terminology`);
  else                     improvements.push(`Include more ${question.cat}-specific keywords and concepts`);
  if (structHits.length > 0) strengths.push('Good answer structure with clear flow');
  else                        improvements.push('Structure your answer: define → explain → give an example');
  if (genHits.length >= 2) strengths.push('Clear reasoning with good connective language');

  if (strengths.length < 2) strengths.push('Attempt shows basic understanding of the topic');
  if (improvements.length < 1) improvements.push('Consider adding a real-world example to strengthen your answer');

  return {
    score,
    verdict: score >= 85 ? 'Outstanding' : score >= 75 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Average' : 'Needs Work',
    strengths:    strengths.slice(0, 2),
    improvements: improvements.slice(0, 2),
    tip: getTip(question.cat, score),
    keywords_found: catHits.slice(0, 5),
    communication_score: Math.min(Math.round(wc * 1.1), 100),
    technical_score:     Math.min(catHits.length * 15, 100),
    model_answer: null,
    filler_words: { found: {}, total: 0, penalty: 0 },
    mode: 'smart',
  };
}

function getTip(cat, score) {
  const tips = {
    'JavaScript':     'Mention the event loop and how JS handles asynchronous operations.',
    'React':          'Explain the problem first, then describe how React solves it.',
    'CSS':            'Give a practical layout example to demonstrate understanding.',
    'Performance':    'Quantify improvements where possible — "reduced load time by X%".',
    'API Design':     'Cover both the happy path and error handling in your answer.',
    'Database':       'Mention trade-offs between different approaches.',
    'Architecture':   'Use the STAR method: Situation, Task, Action, Result.',
    'Security':       'Explain the attack vector before describing the mitigation.',
    'Fundamentals':   'Use a concrete example with real numbers to illustrate the concept.',
    'Deep Learning':  'Explain the intuition before the math.',
    'LLMs':           'Connect your answer to a practical real-world application.',
    'System Design':  'Start with requirements, then scale step by step.',
    'DevOps':         'Mention how this improves developer experience or reliability.',
    'CI/CD':          'Walk through the pipeline stages: build → test → deploy.',
    'Kubernetes':     'Describe the problem containers solve before explaining orchestration.',
    'Reliability':    'Frame your answer around user impact and business continuity.',
    'Cryptography':   'Explain the threat model before the cryptographic solution.',
    'Testing':        'Cover what you test, how you test it, and how you measure success.',
    'NLP':            'Connect the technical concept to a real language challenge.',
    'Blockchain':     'Explain the trust problem that blockchain solves first.',
    'Game Design':    'Relate to player experience and how the mechanic serves the game.',
    'Indexing':       'Describe the underlying data structure and its trade-offs.',
    'RTOS':           'Explain the real-time constraint and why timing matters.',
    'Design Patterns':'Describe the problem it solves before naming the pattern.',
  };
  if (score < 50) return 'Structure your answer: Define the concept → Explain how it works → Give a real example.';
  return tips[cat] || 'Use the STAR method: Situation → Task → Action → Result. Add a concrete example.';
}
