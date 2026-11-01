/**
 * How well you cover a job description, by keywords: the skills and tools
 * the posting names (from the list below, plus your resume's skills and the
 * skills in your IamCandidate Skills tab), and which of them you have, on
 * your resume or in your Skills. When the posting asks for "3+ years of
 * React", your Skills' years for React count too.
 *
 * Runs in the extension (not injected), so it can import and be imported.
 */

/** Common skills, each with the spellings postings use. */
const SKILLS = [
  ["JavaScript", "javascript", "js", "es6"],
  ["TypeScript", "typescript", "ts"],
  ["Python", "python"],
  ["Java", "java"],
  ["Kotlin", "kotlin"],
  ["Swift", "swift"],
  ["Go", "golang"],
  ["Rust", "rust"],
  ["C++", "c++", "cpp"],
  ["C#", "c#", "csharp"],
  [".NET", ".net", "dotnet", "asp.net"],
  ["PHP", "php"],
  ["Ruby", "ruby", "rails", "ruby on rails"],
  ["Scala", "scala"],
  ["Dart", "dart"],
  ["SQL", "sql"],
  ["HTML", "html", "html5"],
  ["CSS", "css", "css3", "scss", "sass"],
  ["React", "react", "react.js", "reactjs"],
  ["React Native", "react native"],
  ["Next.js", "next.js", "nextjs"],
  ["Vue", "vue", "vue.js", "vuejs", "nuxt"],
  ["Angular", "angular"],
  ["Svelte", "svelte"],
  ["Redux", "redux"],
  ["Tailwind", "tailwind", "tailwindcss"],
  ["Node.js", "node", "node.js", "nodejs"],
  ["Express", "express.js", "expressjs"],
  ["NestJS", "nestjs", "nest.js"],
  ["Django", "django"],
  ["Flask", "flask"],
  ["FastAPI", "fastapi"],
  ["Spring", "spring boot", "spring framework"],
  ["Flutter", "flutter"],
  ["Android", "android"],
  ["iOS", "ios"],
  ["GraphQL", "graphql"],
  ["REST APIs", "restful", "rest api", "rest apis"],
  ["gRPC", "grpc"],
  ["Microservices", "microservices", "microservice"],
  ["PostgreSQL", "postgresql", "postgres"],
  ["MySQL", "mysql"],
  ["MongoDB", "mongodb", "mongo"],
  ["Redis", "redis"],
  ["DynamoDB", "dynamodb"],
  ["Elasticsearch", "elasticsearch", "opensearch"],
  ["Kafka", "kafka"],
  ["RabbitMQ", "rabbitmq"],
  ["AWS", "aws", "amazon web services"],
  ["Lambda", "lambda", "serverless"],
  ["GCP", "gcp", "google cloud"],
  ["Azure", "azure"],
  ["Firebase", "firebase"],
  ["Docker", "docker"],
  ["Kubernetes", "kubernetes", "k8s"],
  ["Terraform", "terraform"],
  ["CI/CD", "ci/cd", "cicd", "continuous integration"],
  ["GitHub Actions", "github actions"],
  ["Jenkins", "jenkins"],
  ["Git", "git"],
  ["Linux", "linux"],
  ["Testing", "unit testing", "jest", "vitest", "pytest", "cypress", "playwright", "tdd"],
  ["System design", "system design", "distributed systems", "scalability"],
  ["Data structures", "data structures", "algorithms"],
  ["Machine learning", "machine learning", "ml"],
  ["AI / LLMs", "llm", "llms", "generative ai", "genai", "openai", "langchain", "rag", "prompt engineering"],
  ["Deep learning", "deep learning", "pytorch", "tensorflow"],
  ["Pandas", "pandas", "numpy"],
  ["Spark", "apache spark", "pyspark"],
  ["Airflow", "airflow"],
  ["Figma", "figma"],
  ["Agile", "agile", "scrum"],
  ["Security", "oauth", "jwt", "owasp"],
  ["WebSockets", "websocket", "websockets", "socket.io"],
  ["Performance", "web performance", "core web vitals"],
  ["Accessibility", "accessibility", "a11y", "wcag"],
]

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** Matches a term on its own, so "java" doesn't match "javascript" and "sql" doesn't match "mysql". */
const termPattern = (term) => new RegExp(`(?<![a-z0-9+#.])${escape(term.toLowerCase())}(?![a-z0-9+#])`, "g")

const countIn = (text, terms) => terms.reduce((sum, term) => sum + (text.match(termPattern(term))?.length ?? 0), 0)

/** Everything a resume says, as plain lowercase text. */
export function resumeText(resume) {
  const parts = [
    resume.title,
    resume.targetRole,
    resume.summary,
    ...(resume.skills ?? []),
    ...(resume.experience ?? []).flatMap((e) => [e.title, e.company, ...(e.highlights ?? [])]),
    ...(resume.education ?? []).flatMap((e) => [e.degree, e.school]),
    // LaTeX source without its commands.
    String(resume.latexSource ?? "").replace(/\\[a-zA-Z]+\*?/g, " ").replace(/[{}[\]%$&_^~]/g, " "),
  ]
  return parts.filter(Boolean).join(" \n ").toLowerCase()
}

const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 }
const YEARS = /\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s*\+?\s*(?:(?:-|–|to)\s*\d{1,2}\s*)?\+?\s*(?:years?|yrs?)\b/g

/** The most years the job asks for with a skill: "3+ years of React", "React (5 yrs)". 0 when it doesn't say. */
function yearsAsked(job, terms) {
  let most = 0
  // Within a sentence or bullet, the years and the skill sit close together.
  // A full stop ends a sentence; the one in "node.js" doesn't.
  for (const sentence of job.split(/\.(?=\s|$)|[\n•;]+/)) {
    const where = terms.flatMap((term) => [...sentence.matchAll(termPattern(term))].map((m) => m.index))
    if (!where.length) continue
    for (const m of sentence.matchAll(YEARS)) {
      const years = NUMBER_WORDS[m[1]] ?? Number(m[1])
      if (years > 0 && where.some((at) => Math.abs(at - m.index) <= 60)) most = Math.max(most, years)
    }
  }
  return most
}

/**
 * The overall experience a job asks for, in years: the most a line like
 * "5+ years of experience" or "3-5 years of professional experience" names.
 * 0 when it doesn't say.
 */
export function experienceAsked(description) {
  const job = String(description ?? "").toLowerCase()
  let most = 0
  for (const m of job.matchAll(YEARS)) {
    // "years of (relevant / total / professional / industry / hands-on) experience", or "experience: 5+ years".
    const after = job.slice(m.index + m[0].length, m.index + m[0].length + 45)
    const before = job.slice(Math.max(0, m.index - 30), m.index)
    if (/^\s*(?:of\s+)?(?:[\w-]+\s+){0,3}?experience\b/.test(after) || /experience\s*(?:required)?\s*[:-]?\s*(?:of\s+)?(?:at least\s+|minimum\s+|min\.?\s+)?$/.test(before)) {
      const years = NUMBER_WORDS[m[1]] ?? Number(m[1])
      if (years > 0 && years <= 30) most = Math.max(most, years)
    }
  }
  return most
}

/**
 * Your total years from your autofill details: "Years of experience" when
 * it's filled in, otherwise added up from your work history (overlaps
 * counted once). 0 when neither says.
 */
export function totalYears(details) {
  const stated = Number.parseFloat(String(details?.experienceYears ?? "").replace(/[^\d.]/g, ""))
  if (stated > 0) return stated
  const now = new Date()
  const monthOf = (yearMonth) => {
    const [, y, m] = String(yearMonth ?? "").match(/^(\d{4})-(\d{2})$/) ?? []
    return y ? Number(y) * 12 + Number(m) - 1 : undefined
  }
  const spans = (Array.isArray(details?.experience) ? details.experience : [])
    .map((job) => [monthOf(job.startDate), job.current ? now.getFullYear() * 12 + now.getMonth() : monthOf(job.endDate)])
    .filter(([start, end]) => start !== undefined && end !== undefined && end >= start)
    .sort((a, b) => a[0] - b[0])
  let months = 0
  let open
  for (const [start, end] of spans) {
    if (open && start <= open[1]) open[1] = Math.max(open[1], end)
    else {
      if (open) months += open[1] - open[0]
      open = [start, end]
    }
  }
  if (open) months += open[1] - open[0]
  return Math.round((months / 12) * 10) / 10
}

/**
 * `{ score, matched, missing, years, experience }` against a job description, or
 * undefined when the description names no keywords. `skills` are your
 * IamCandidate Skills (`{ name, years }`; 0 years means not set). `matched`
 * and `missing` are names; `years` is `[{ name, asked, have }]` for the
 * matched skills the job asks a number of years for. A skill you have with
 * fewer years than asked counts in proportion; one without years counts in
 * full. `experience` is `{ asked, have }` when the job asks for overall
 * years, `have` being `myYears` (your total, 0 when unknown); it counts as
 * one more requirement once your total is known.
 */
export function matchResume(resume, description, skills = [], myYears = 0) {
  const job = String(description ?? "").toLowerCase()
  if ((!resume && !skills.length) || job.length < 40) return undefined

  const candidates = new Map()
  for (const [name, ...terms] of SKILLS) candidates.set(name.toLowerCase(), { name, terms })
  // Your own skills count too, when the posting names them.
  for (const skill of [...(resume?.skills ?? []), ...skills.map((s) => s.name)]) {
    const name = String(skill ?? "").trim()
    if (name.length > 1 && name.length < 40 && !candidates.has(name.toLowerCase())) {
      candidates.set(name.toLowerCase(), { name, terms: [name] })
    }
  }

  const wanted = [...candidates.values()]
    .map((skill) => ({ ...skill, count: countIn(job, skill.terms) }))
    .filter((skill) => skill.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)
  if (!wanted.length) return undefined

  const text = resume ? resumeText(resume) : ""
  const mine = skills.map((s) => ({ name: String(s.name ?? "").trim().toLowerCase(), years: Number(s.years) || 0 }))
  const matched = []
  const missing = []
  const years = []
  let points = 0
  for (const skill of wanted) {
    // Your Skills entry for it: named like it, or one of its spellings ("ReactJS" for React).
    const own = mine.filter((s) => s.name === skill.name.toLowerCase() || skill.terms.some((t) => t.toLowerCase() === s.name))
    if (!own.length && !countIn(text, skill.terms)) {
      missing.push(skill.name)
      continue
    }
    matched.push(skill.name)
    const asked = yearsAsked(job, skill.terms)
    const have = Math.max(0, ...own.map((s) => s.years))
    if (asked) years.push({ name: skill.name, asked, have })
    points += asked && have ? Math.min(1, have / asked) : 1
  }
  const asked = experienceAsked(job)
  const experience = asked ? { asked, have: myYears } : undefined
  let total = wanted.length
  if (experience?.have) {
    points += Math.min(1, experience.have / asked)
    total += 1
  }
  return { score: Math.round((points / total) * 100), matched, missing, years, experience }
}
