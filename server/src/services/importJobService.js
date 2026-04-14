function makeJobId() {
  return `job_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

const jobs = new Map();

function createJob({ type, meta }) {
  const id = makeJobId();
  const job = {
    id,
    type,
    meta: meta || {},
    status: "queued",
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    progress: { done: 0, total: 0 },
    results: [],
    error: null,
  };
  jobs.set(id, job);
  return job;
}

function getJob(jobId) {
  return jobs.get(String(jobId)) || null;
}

function updateJob(jobId, patch) {
  const job = getJob(jobId);
  if (!job) return null;
  Object.assign(job, patch);
  return job;
}

function pushJobResult(jobId, item) {
  const job = getJob(jobId);
  if (!job) return null;
  job.results.push(item);
  if (job.results.length > 50) job.results.splice(0, job.results.length - 50);
  return job;
}

module.exports = { createJob, getJob, updateJob, pushJobResult };

