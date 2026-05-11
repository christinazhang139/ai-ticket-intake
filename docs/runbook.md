# AI Ticket Intake — Operations Runbook

## 1. Application Not Accessible

**Symptom:** Users cannot reach the application URL.

**Diagnosis steps:**

```bash
# 1. Check if Pods are running
oc get pods -n ai-ticket-intake

# 2. If Pods are not Running, check events
oc describe pod <pod-name> -n ai-ticket-intake

# 3. Check Pod logs
oc logs <pod-name> -n ai-ticket-intake

# 4. Check if Service is healthy
oc get svc ai-ticket-intake -n ai-ticket-intake
oc get endpoints ai-ticket-intake -n ai-ticket-intake

# 5. Check if Route exists and is configured
oc get route ai-ticket-intake -n ai-ticket-intake

# 6. Test from inside the cluster
oc run debug --rm -it --image=busybox -n ai-ticket-intake -- wget -qO- http://ai-ticket-intake:3000/api/health
```

**Common causes and fixes:**

| Cause | Fix |
|-------|-----|
| Pods in CrashLoopBackOff | Check logs: `oc logs <pod>`. Common: wrong image architecture (ARM vs AMD64), missing env vars |
| Pods in ImagePullBackOff | Check image exists: `oc get imagestream -n ai-ticket-intake`. Rebuild and push if missing |
| No endpoints on Service | Labels don't match: compare `oc get svc -o yaml` selector with Pod labels |
| Route returns 503 | Readiness probe failing: check `/api/health` responds on port 3000 |

---

## 2. CI Pipeline Failed

**Symptom:** PipelineRun shows `Failed` status.

**Diagnosis steps:**

```bash
# 1. List recent PipelineRuns
oc get pipelinerun -n ai-ticket-intake --sort-by=.metadata.creationTimestamp

# 2. Describe the failed run
oc describe pipelinerun <run-name> -n ai-ticket-intake

# 3. Check which TaskRun failed
oc get taskrun -n ai-ticket-intake -l tekton.dev/pipelineRun=<run-name>

# 4. Get logs from the failed Pod
oc logs <taskrun-pod-name> -n ai-ticket-intake --all-containers
```

**Common causes and fixes:**

| Cause | Fix |
|-------|-----|
| PipelineValidationFailed | Parameter names are case-sensitive. Check Task parameter names: `oc get task git-clone -n openshift-pipelines -o jsonpath='{.spec.params[*].name}'` |
| Clone failed | Verify Git URL is correct and repo is public (or credentials are configured) |
| Build failed - Dockerfile not found | Check CONTEXT and DOCKERFILE paths match repo structure |
| Push failed - unauthorized | Add image-builder role: `oc policy add-role-to-user system:image-builder system:serviceaccount:ai-ticket-intake:pipeline -n ai-ticket-intake` |
| PVC Pending | Check StorageClass exists: `oc get sc`. Use `gp3-csi` for this cluster |

---

## 3. ArgoCD Out of Sync

**Symptom:** ArgoCD Application shows `OutOfSync` or `Degraded`.

**Diagnosis steps:**

```bash
# 1. Check Application status
oc get application ai-ticket-intake -n openshift-gitops -o yaml | grep -A 10 "status:"

# 2. Check sync details in ArgoCD UI
# Open ArgoCD URL → click on the Application → check sync status and error messages

# 3. Verify Git repo is accessible
git ls-remote https://github.com/christinazhang139/ai-ticket-intake.git
```

**Common causes and fixes:**

| Cause | Fix |
|-------|-----|
| OutOfSync but not auto-syncing | Verify `syncPolicy.automated` is set in Application YAML |
| Git repo not accessible | Check repo URL and if it's public |
| Manifest render error | Run `oc kustomize deploy/overlays/dev/` locally to verify Kustomize output |
| Namespace not managed | Add label: `oc label namespace ai-ticket-intake argocd.argoproj.io/managed-by=openshift-gitops` |

---

## 4. Alert Triggered

### HighErrorRate

**What it means:** The application is returning HTTP 5xx errors at a rate above 5% over the last 5 minutes.

**Steps:**
1. Check application logs for errors:
   ```bash
   oc logs -l app=ai-ticket-intake -n ai-ticket-intake --tail=50
   ```
2. Check if there was a recent deployment (bad code):
   ```bash
   oc rollout history deployment/ai-ticket-intake -n ai-ticket-intake
   ```
3. If caused by bad deployment, rollback:
   ```bash
   oc rollout undo deployment/ai-ticket-intake -n ai-ticket-intake
   ```

### PodRestarting

**What it means:** A Pod restarted unexpectedly in the last 15 minutes.

**Steps:**
1. Check which Pod restarted:
   ```bash
   oc get pods -n ai-ticket-intake -o wide
   ```
2. Check previous container logs:
   ```bash
   oc logs <pod-name> -n ai-ticket-intake --previous
   ```
3. Check events for OOMKilled or other reasons:
   ```bash
   oc describe pod <pod-name> -n ai-ticket-intake | grep -A 5 "Last State"
   ```

### HighMemoryUsage

**What it means:** Container memory usage exceeds 85% of its limit (512Mi).

**Steps:**
1. Check current memory usage:
   ```bash
   oc adm top pods -n ai-ticket-intake
   ```
2. If consistently high, increase memory limit in `deploy/base/deployment.yaml` and push to Git
3. ArgoCD will auto-sync the new limits

---

## 5. Rollback Procedures

### Via Git (recommended — GitOps way)

```bash
# Find the commit to revert to
cd ai-ticket-intake
git log --oneline -5

# Revert the bad commit
git revert <bad-commit-hash>
git push

# ArgoCD will auto-sync within 3 minutes
# Or manually sync in ArgoCD UI
```

### Via ArgoCD UI

1. Open ArgoCD UI
2. Click on the Application
3. Click "History and rollback"
4. Select the previous healthy version
5. Click "Rollback"

### Via oc CLI (emergency only)

```bash
oc rollout undo deployment/ai-ticket-intake -n ai-ticket-intake
```

> Note: This bypasses GitOps. ArgoCD will detect drift and may revert your rollback. Use Git-based rollback when possible.

---

## 6. Grafana Not Showing Data

**Symptom:** Grafana dashboards are empty or data sources show errors.

**Steps:**

```bash
# 1. Check Grafana Pod is running
oc get pods -n ai-ticket-intake -l app=grafana

# 2. Check if datasources ConfigMap exists
oc get configmap grafana-datasources -n ai-ticket-intake

# 3. Verify Prometheus is reachable from Grafana Pod
oc exec $(oc get pod -l app=grafana -n ai-ticket-intake -o name) -n ai-ticket-intake -- wget -qO- --no-check-certificate --header="Authorization: Bearer $(oc create token default -n ai-ticket-intake)" "https://thanos-querier.openshift-monitoring.svc:9091/api/v1/query?query=up" 2>&1 | head -1

# 4. If token expired, regenerate and recreate ConfigMap
oc create token default -n ai-ticket-intake --duration=8760h
# Update the grafana-datasources ConfigMap with the new token
```

---

## 7. Useful Commands Quick Reference

```bash
# Application status
oc get pods -n ai-ticket-intake
oc get pods -n ai-ticket-intake -o wide          # with node/AZ info
oc get route ai-ticket-intake -n ai-ticket-intake -o jsonpath='{.spec.host}'

# CI/CD status
oc get pipelinerun -n ai-ticket-intake
oc get application -n openshift-gitops

# Monitoring
oc get pods -n openshift-user-workload-monitoring
oc get servicemonitor -n ai-ticket-intake
oc get prometheusrule -n ai-ticket-intake

# Logging
oc get pods -n openshift-logging
oc get lokistack -n openshift-logging

# Scaling
oc get hpa -n ai-ticket-intake
oc adm top pods -n ai-ticket-intake

# Grafana
echo "https://$(oc get route grafana -n ai-ticket-intake -o jsonpath='{.spec.host}')"

# ArgoCD
echo "https://$(oc get route openshift-gitops-server -n openshift-gitops -o jsonpath='{.spec.host}')"
```
