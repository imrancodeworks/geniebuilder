"""
Comprehensive skills taxonomy organized by category.
Used for matching resume skills against job description requirements.
"""

SKILLS_TAXONOMY = {
    "programming_languages": [
        "python", "javascript", "typescript", "java", "c", "c++", "c#", "go", "golang",
        "rust", "ruby", "php", "swift", "kotlin", "scala", "r", "matlab", "perl",
        "bash", "shell", "powershell", "lua", "haskell", "erlang", "elixir", "clojure",
        "f#", "dart", "julia", "cobol", "fortran", "assembly", "vba", "groovy",
        "objective-c", "d", "nim", "zig", "crystal"
    ],
    "web_frontend": [
        "html", "css", "html5", "css3", "sass", "less", "scss", "tailwind", "bootstrap",
        "react", "reactjs", "react.js", "angular", "angularjs", "vue", "vuejs", "vue.js",
        "svelte", "next.js", "nextjs", "nuxt", "nuxtjs", "gatsby", "remix",
        "jquery", "webpack", "vite", "rollup", "parcel", "babel", "eslint",
        "redux", "mobx", "zustand", "recoil", "context api", "graphql", "apollo",
        "responsive design", "web components", "pwa", "spa", "jamstack",
        "storybook", "jest", "cypress", "playwright", "testing library"
    ],
    "web_backend": [
        "django", "flask", "fastapi", "express", "expressjs", "nestjs", "nest.js",
        "spring", "spring boot", "rails", "ruby on rails", "laravel", "symfony",
        "asp.net", ".net", "node.js", "nodejs", "deno", "koa", "hapi",
        "grpc", "rest", "restful", "rest api", "graphql", "websockets",
        "microservices", "serverless", "lambda", "api gateway", "oauth", "jwt"
    ],
    "databases": [
        "sql", "mysql", "postgresql", "postgres", "sqlite", "oracle", "sql server",
        "mssql", "mariadb", "nosql", "mongodb", "redis", "elasticsearch",
        "cassandra", "dynamodb", "firestore", "firebase", "couchdb", "neo4j",
        "influxdb", "timescaledb", "supabase", "cockroachdb", "planetscale",
        "database design", "data modeling", "orm", "sqlalchemy", "prisma",
        "query optimization", "indexing", "stored procedures", "triggers"
    ],
    "cloud_devops": [
        "aws", "amazon web services", "azure", "microsoft azure", "gcp",
        "google cloud", "google cloud platform", "cloud computing",
        "docker", "kubernetes", "k8s", "helm", "terraform", "ansible",
        "jenkins", "gitlab ci", "github actions", "circleci", "travis ci",
        "ci/cd", "devops", "devsecops", "linux", "unix", "nginx", "apache",
        "load balancing", "auto scaling", "ec2", "s3", "lambda", "rds",
        "cloudformation", "pulumi", "vault", "consul", "prometheus", "grafana",
        "datadog", "splunk", "elk stack", "logstash", "kibana"
    ],
    "data_science_ml": [
        "machine learning", "deep learning", "neural networks", "nlp",
        "natural language processing", "computer vision", "data science",
        "data analysis", "data mining", "feature engineering", "model training",
        "scikit-learn", "sklearn", "tensorflow", "pytorch", "keras",
        "pandas", "numpy", "scipy", "matplotlib", "seaborn", "plotly",
        "jupyter", "hugging face", "transformers", "bert", "gpt",
        "xgboost", "lightgbm", "random forest", "regression", "classification",
        "clustering", "pca", "dimensionality reduction", "a/b testing",
        "statistics", "statistical analysis", "hypothesis testing",
        "data visualization", "tableau", "power bi", "looker", "metabase"
    ],
    "mobile": [
        "ios", "android", "react native", "flutter", "dart", "swift",
        "objective-c", "kotlin", "java android", "xamarin", "ionic",
        "capacitor", "cordova", "expo", "mobile development",
        "app store", "google play", "push notifications", "firebase"
    ],
    "cybersecurity": [
        "cybersecurity", "information security", "infosec", "penetration testing",
        "pen testing", "ethical hacking", "vulnerability assessment", "siem",
        "firewall", "ids", "ips", "soc", "incident response", "forensics",
        "owasp", "encryption", "cryptography", "pki", "ssl", "tls",
        "compliance", "gdpr", "hipaa", "soc2", "iso 27001", "nist",
        "burp suite", "metasploit", "nmap", "wireshark", "kali linux"
    ],
    "project_management": [
        "project management", "agile", "scrum", "kanban", "waterfall",
        "jira", "confluence", "trello", "asana", "monday.com", "notion",
        "product management", "product owner", "scrum master",
        "sprint planning", "backlog grooming", "roadmap", "okrs", "kpis",
        "risk management", "stakeholder management", "budget management",
        "pmp", "prince2", "safe", "lean", "six sigma"
    ],
    "design": [
        "ux", "ui", "ux/ui", "user experience", "user interface", "figma",
        "sketch", "adobe xd", "invision", "zeplin", "prototyping", "wireframing",
        "design systems", "accessibility", "a11y", "wcag", "user research",
        "usability testing", "information architecture", "typography",
        "photoshop", "illustrator", "after effects", "premiere pro",
        "indesign", "canva", "motion graphics", "branding"
    ],
    "soft_skills": [
        "leadership", "communication", "teamwork", "collaboration", "problem solving",
        "critical thinking", "analytical thinking", "adaptability", "creativity",
        "time management", "attention to detail", "organizational skills",
        "presentation skills", "mentoring", "coaching", "negotiation",
        "conflict resolution", "customer service", "public speaking"
    ],
    "data_engineering": [
        "data engineering", "etl", "elt", "data pipeline", "data warehouse",
        "data lake", "apache spark", "pyspark", "hadoop", "kafka", "airflow",
        "dbt", "fivetran", "stitch", "snowflake", "bigquery", "redshift",
        "databricks", "delta lake", "parquet", "avro", "streaming",
        "batch processing", "data quality", "data governance"
    ],
    "networking": [
        "networking", "tcp/ip", "dns", "dhcp", "vpn", "wan", "lan", "vlan",
        "routing", "switching", "bgp", "ospf", "mpls", "sdwan", "cdn",
        "cisco", "juniper", "network security", "firewall configuration",
        "network monitoring", "snmp", "network troubleshooting"
    ],
    "blockchain": [
        "blockchain", "solidity", "ethereum", "bitcoin", "web3", "defi",
        "smart contracts", "nft", "cryptocurrency", "hyperledger",
        "consensus algorithms", "distributed ledger", "metamask", "hardhat"
    ],
    "testing_qa": [
        "testing", "qa", "quality assurance", "unit testing", "integration testing",
        "end-to-end testing", "e2e", "tdd", "bdd", "selenium", "cypress",
        "playwright", "jest", "pytest", "junit", "mocha", "chai",
        "load testing", "performance testing", "jmeter", "k6", "postman",
        "api testing", "test automation", "test planning", "bug tracking"
    ]
}

# Flatten all skills into a single list (lowercase)
ALL_SKILLS = []
for category, skills in SKILLS_TAXONOMY.items():
    ALL_SKILLS.extend(skills)

# Create a set for O(1) lookup
ALL_SKILLS_SET = set(ALL_SKILLS)

EDUCATION_LEVELS = {
    "phd": 6, "ph.d": 6, "doctorate": 6, "doctoral": 6,
    "master": 5, "masters": 5, "mba": 5, "m.s": 5, "m.sc": 5, "m.eng": 5, "m.tech": 5,
    "bachelor": 4, "bachelors": 4, "b.s": 4, "b.sc": 4, "b.e": 4, "b.tech": 4, "b.a": 4,
    "associate": 3, "diploma": 2, "certificate": 2, "high school": 1, "ged": 1
}

EDUCATION_FIELDS = [
    "computer science", "software engineering", "information technology", "it",
    "electrical engineering", "electronics", "data science", "mathematics", "statistics",
    "physics", "mechanical engineering", "civil engineering", "chemical engineering",
    "business administration", "finance", "accounting", "economics", "marketing",
    "psychology", "biology", "chemistry", "communications", "graphic design",
    "information systems", "cybersecurity", "artificial intelligence", "machine learning"
]


def get_all_skills():
    return ALL_SKILLS


def normalize_skill(skill: str) -> str:
    """Normalize a skill string for comparison."""
    return skill.lower().strip()


def get_skills_by_category(category: str) -> list:
    return SKILLS_TAXONOMY.get(category, [])


def find_skill_category(skill: str) -> str:
    skill_lower = skill.lower()
    for category, skills in SKILLS_TAXONOMY.items():
        if skill_lower in skills:
            return category
    return "other"
