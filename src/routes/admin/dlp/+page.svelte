<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api';
  import { toastStore } from '$lib/stores/toast';
  import { Shield, AlertTriangle, FileSearch, Settings, Download, Plus, Edit, Trash2, Eye, CheckCircle, XCircle } from 'lucide-svelte';

  let activeTab = 'overview';
  let isLoading = false;
  let statistics = null;
  let policies = [];
  let violations = [];
  let quarantinedContent = [];
  let selectedPolicy = null;
  let showPolicyModal = false;
  let showTestModal = false;
  let showViolationModal = false;
  let selectedViolation = null;

  // Policy form data
  let policyForm = {
    name: '',
    description: '',
    dataTypes: [],
    actions: [],
    severity: 'medium',
    enabled: true,
    notifications: [],
    exemptions: []
  };

  // Test form data
  let testContent = '';
  let testResults = null;

  // Available options
  const dataTypeOptions = [
    { value: 'creditCard', label: 'Credit Card Numbers' },
    { value: 'ssn', label: 'Social Security Numbers' },
    { value: 'email', label: 'Email Addresses' },
    { value: 'phone', label: 'Phone Numbers' },
    { value: 'ipAddress', label: 'IP Addresses' },
    { value: 'apiKey', label: 'API Keys & Tokens' },
    { value: 'dbConnection', label: 'Database Connection Strings' },
    { value: 'awsCredentials', label: 'AWS Credentials' },
    { value: 'privateKey', label: 'Private Keys' }
  ];

  const actionOptions = [
    { value: 'block', label: 'Block Content' },
    { value: 'redact', label: 'Redact Sensitive Data' },
    { value: 'quarantine', label: 'Quarantine for Review' },
    { value: 'alert', label: 'Send Alert' },
    { value: 'audit', label: 'Audit Log Only' },
    { value: 'classify', label: 'Classify Content' }
  ];

  const severityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' }
  ];

  onMount(async () => {
    await loadDashboardData();
  });

  async function loadDashboardData() {
    isLoading = true;
    try {
      const [statsRes, policiesRes, violationsRes, quarantineRes] = await Promise.allSettled([
        api.getDLPStatistics(),
        api.getDLPPolicies(),
        api.getDLPViolations({ limit: 50 }),
        api.getQuarantinedContent()
      ]);

      if (statsRes.status === 'fulfilled') statistics = statsRes.value.statistics;
      if (policiesRes.status === 'fulfilled') policies = policiesRes.value.policies;
      if (violationsRes.status === 'fulfilled') violations = violationsRes.value.violations;
      if (quarantineRes.status === 'fulfilled') quarantinedContent = quarantineRes.value.quarantinedContent;

    } catch (error) {
      console.error('Failed to load DLP data:', error);
      toastStore.add({
        type: 'error',
        message: 'Failed to load DLP dashboard data',
        duration: 4000
      });
    } finally {
      isLoading = false;
    }
  }

  async function createPolicy() {
    try {
      await api.createDLPPolicy(policyForm);
      
      toastStore.add({
        type: 'success',
        message: 'DLP policy created successfully',
        duration: 3000
      });

      showPolicyModal = false;
      resetPolicyForm();
      await loadDashboardData();

    } catch (error) {
      toastStore.add({
        type: 'error',
        message: 'Failed to create DLP policy',
        duration: 4000
      });
    }
  }

  async function updatePolicy() {
    if (!selectedPolicy) return;

    try {
      await api.updateDLPPolicy(selectedPolicy.id, policyForm);
      
      toastStore.add({
        type: 'success',
        message: 'DLP policy updated successfully',
        duration: 3000
      });

      showPolicyModal = false;
      resetPolicyForm();
      await loadDashboardData();

    } catch (error) {
      toastStore.add({
        type: 'error',
        message: 'Failed to update DLP policy',
        duration: 4000
      });
    }
  }

  async function testDLPPatterns() {
    if (!testContent.trim()) return;

    try {
      const response = await api.testDLPPatterns(testContent);
      testResults = response.testResult;

      toastStore.add({
        type: 'info',
        message: `DLP test completed. Found ${testResults.findings.length} potential issues.`,
        duration: 3000
      });

    } catch (error) {
      toastStore.add({
        type: 'error',
        message: 'Failed to test DLP patterns',
        duration: 4000
      });
    }
  }

  async function resolveViolation(violationId: string, resolution: string, notes: string) {
    try {
      await api.resolveDLPViolation(violationId, resolution, notes);
      
      toastStore.add({
        type: 'success',
        message: 'Violation resolved successfully',
        duration: 3000
      });

      showViolationModal = false;
      await loadDashboardData();

    } catch (error) {
      toastStore.add({
        type: 'error',
        message: 'Failed to resolve violation',
        duration: 4000
      });
    }
  }

  async function exportCompliance() {
    try {
      const response = await api.exportDLPCompliance({ format: 'json' });
      
      const blob = new Blob([JSON.stringify(response.complianceData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dlp-compliance-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toastStore.add({
        type: 'success',
        message: 'Compliance report exported successfully',
        duration: 3000
      });

    } catch (error) {
      toastStore.add({
        type: 'error',
        message: 'Failed to export compliance report',
        duration: 4000
      });
    }
  }

  function editPolicy(policy) {
    selectedPolicy = policy;
    policyForm = {
      name: policy.name,
      description: policy.description,
      dataTypes: [...policy.dataTypes],
      actions: [...policy.actions],
      severity: policy.severity,
      enabled: policy.enabled,
      notifications: [...(policy.notifications || [])],
      exemptions: [...(policy.exemptions || [])]
    };
    showPolicyModal = true;
  }

  function resetPolicyForm() {
    selectedPolicy = null;
    policyForm = {
      name: '',
      description: '',
      dataTypes: [],
      actions: [],
      severity: 'medium',
      enabled: true,
      notifications: [],
      exemptions: []
    };
  }

  function getSeverityColor(severity) {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-400/10';
      case 'high': return 'text-orange-400 bg-orange-400/10';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10';
      case 'low': return 'text-blue-400 bg-blue-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  }

  function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString();
  }
</script>

<div class="p-6">
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-white flex items-center">
        <Shield class="w-8 h-8 mr-3 text-primary-400" />
        Data Loss Prevention
      </h1>
      <p class="text-gray-400 mt-1">Monitor and protect sensitive data across your organization</p>
    </div>
    
    <div class="flex space-x-3">
      <button
        on:click={exportCompliance}
        class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center transition-colors"
      >
        <Download class="w-4 h-4 mr-2" />
        Export Report
      </button>
      <button
        on:click={() => { resetPolicyForm(); showPolicyModal = true; }}
        class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center transition-colors"
      >
        <Plus class="w-4 h-4 mr-2" />
        New Policy
      </button>
    </div>
  </div>

  <!-- Navigation Tabs -->
  <div class="flex space-x-1 bg-dark-800 p-1 rounded-lg mb-6">
    {#each [
      { id: 'overview', label: 'Overview', icon: Shield },
      { id: 'policies', label: 'Policies', icon: Settings },
      { id: 'violations', label: 'Violations', icon: AlertTriangle },
      { id: 'quarantine', label: 'Quarantine', icon: FileSearch },
      { id: 'test', label: 'Test', icon: Eye }
    ] as tab}
      <button
        class="px-4 py-2 rounded-md flex items-center transition-colors {
          activeTab === tab.id 
            ? 'bg-primary-600 text-white' 
            : 'text-gray-400 hover:text-white hover:bg-dark-700'
        }"
        on:click={() => activeTab = tab.id}
      >
        <svelte:component this={tab.icon} class="w-4 h-4 mr-2" />
        {tab.label}
        {#if tab.id === 'violations' && statistics}
          <span class="ml-2 px-2 py-1 bg-red-600 text-xs rounded-full">
            {statistics.unresolvedViolations}
          </span>
        {/if}
      </button>
    {/each}
  </div>

  {#if isLoading}
    <div class="flex items-center justify-center h-64">
      <div class="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"></div>
    </div>
  {:else}
    <!-- Overview Tab -->
    {#if activeTab === 'overview' && statistics}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-dark-800 p-6 rounded-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-400 text-sm">Active Policies</p>
              <p class="text-2xl font-bold text-white">{statistics.activePolicies}</p>
            </div>
            <Settings class="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div class="bg-dark-800 p-6 rounded-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-400 text-sm">Violations Today</p>
              <p class="text-2xl font-bold text-white">{statistics.violationsToday}</p>
            </div>
            <AlertTriangle class="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div class="bg-dark-800 p-6 rounded-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-400 text-sm">Unresolved Issues</p>
              <p class="text-2xl font-bold text-white">{statistics.unresolvedViolations}</p>
            </div>
            <XCircle class="w-8 h-8 text-red-400" />
          </div>
        </div>

        <div class="bg-dark-800 p-6 rounded-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-400 text-sm">Quarantined Items</p>
              <p class="text-2xl font-bold text-white">{statistics.quarantinedItems}</p>
            </div>
            <FileSearch class="w-8 h-8 text-orange-400" />
          </div>
        </div>
      </div>

      <!-- Severity Breakdown -->
      <div class="bg-dark-800 p-6 rounded-lg mb-6">
        <h3 class="text-lg font-semibold text-white mb-4">Violations by Severity</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          {#each Object.entries(statistics.severityBreakdown) as [severity, count]}
            <div class="text-center">
              <div class="text-2xl font-bold {getSeverityColor(severity).split(' ')[0]}">{count}</div>
              <div class="text-sm text-gray-400 capitalize">{severity}</div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Data Type Breakdown -->
      <div class="bg-dark-800 p-6 rounded-lg">
        <h3 class="text-lg font-semibold text-white mb-4">Most Common Data Types</h3>
        <div class="space-y-3">
          {#each Object.entries(statistics.dataTypeBreakdown).slice(0, 5) as [dataType, count]}
            <div class="flex items-center justify-between">
              <span class="text-gray-300 capitalize">{dataType.replace(/([A-Z])/g, ' $1')}</span>
              <div class="flex items-center">
                <span class="text-white font-semibold mr-3">{count}</span>
                <div class="w-24 bg-dark-700 rounded-full h-2">
                  <div 
                    class="bg-primary-500 h-2 rounded-full" 
                    style="width: {Math.min((count / Math.max(...Object.values(statistics.dataTypeBreakdown))) * 100, 100)}%"
                  ></div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Policies Tab -->
    {#if activeTab === 'policies'}
      <div class="bg-dark-800 rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-dark-900">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Policy</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Data Types</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Severity</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-dark-700">
              {#each policies as policy}
                <tr class="hover:bg-dark-700">
                  <td class="px-6 py-4">
                    <div>
                      <div class="font-medium text-white">{policy.name}</div>
                      <div class="text-sm text-gray-400">{policy.description}</div>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex flex-wrap gap-1">
                      {#each policy.dataTypes.slice(0, 3) as dataType}
                        <span class="px-2 py-1 bg-blue-400/10 text-blue-400 text-xs rounded">
                          {dataType}
                        </span>
                      {/each}
                      {#if policy.dataTypes.length > 3}
                        <span class="px-2 py-1 bg-gray-400/10 text-gray-400 text-xs rounded">
                          +{policy.dataTypes.length - 3}
                        </span>
                      {/if}
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <span class="px-2 py-1 rounded text-xs {getSeverityColor(policy.severity)}">
                      {policy.severity}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <span class="flex items-center">
                      {#if policy.enabled}
                        <CheckCircle class="w-4 h-4 text-green-400 mr-1" />
                        <span class="text-green-400 text-sm">Enabled</span>
                      {:else}
                        <XCircle class="w-4 h-4 text-gray-400 mr-1" />
                        <span class="text-gray-400 text-sm">Disabled</span>
                      {/if}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <button
                      on:click={() => editPolicy(policy)}
                      class="text-primary-400 hover:text-primary-300 mr-3"
                    >
                      <Edit class="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}

    <!-- Violations Tab -->
    {#if activeTab === 'violations'}
      <div class="bg-dark-800 rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-dark-900">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Policy</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Data Type</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Severity</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-dark-700">
              {#each violations as violation}
                <tr class="hover:bg-dark-700">
                  <td class="px-6 py-4 text-sm text-gray-300">
                    {formatDate(violation.timestamp)}
                  </td>
                  <td class="px-6 py-4 text-sm font-medium text-white">
                    {violation.policyName}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-300">
                    {violation.finding.dataType}
                  </td>
                  <td class="px-6 py-4">
                    <span class="px-2 py-1 rounded text-xs {getSeverityColor(violation.severity)}">
                      {violation.severity}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    {#if violation.resolved}
                      <span class="flex items-center text-green-400 text-sm">
                        <CheckCircle class="w-4 h-4 mr-1" />
                        Resolved
                      </span>
                    {:else}
                      <span class="flex items-center text-orange-400 text-sm">
                        <AlertTriangle class="w-4 h-4 mr-1" />
                        Open
                      </span>
                    {/if}
                  </td>
                  <td class="px-6 py-4">
                    {#if !violation.resolved}
                      <button
                        on:click={() => {
                          selectedViolation = violation;
                          showViolationModal = true;
                        }}
                        class="text-primary-400 hover:text-primary-300"
                      >
                        Resolve
                      </button>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}

    <!-- Quarantine Tab -->
    {#if activeTab === 'quarantine'}
      <div class="bg-dark-800 rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-dark-900">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Content Type</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Data Type</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-dark-700">
              {#each quarantinedContent as item}
                <tr class="hover:bg-dark-700">
                  <td class="px-6 py-4 text-sm text-gray-300">
                    {formatDate(item.timestamp)}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-300">
                    {item.context.contentType}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-300">
                    {item.finding.dataType}
                  </td>
                  <td class="px-6 py-4">
                    <span class="px-2 py-1 bg-orange-400/10 text-orange-400 text-xs rounded">
                      {item.status}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    {#if item.status === 'quarantined'}
                      <div class="flex space-x-2">
                        <button
                          on:click={() => api.reviewQuarantinedContent(item.id, 'approve')}
                          class="text-green-400 hover:text-green-300 text-sm"
                        >
                          Approve
                        </button>
                        <button
                          on:click={() => api.reviewQuarantinedContent(item.id, 'reject')}
                          class="text-red-400 hover:text-red-300 text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}

    <!-- Test Tab -->
    {#if activeTab === 'test'}
      <div class="bg-dark-800 p-6 rounded-lg">
        <h3 class="text-lg font-semibold text-white mb-4">Test DLP Detection</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Test Content
            </label>
            <textarea
              bind:value={testContent}
              placeholder="Enter content to test DLP detection patterns..."
              class="w-full h-32 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
            ></textarea>
          </div>
          
          <button
            on:click={testDLPPatterns}
            disabled={!testContent.trim()}
            class="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg"
          >
            Run Test
          </button>

          {#if testResults}
            <div class="mt-6 space-y-4">
              <div class="bg-dark-700 p-4 rounded-lg">
                <h4 class="font-medium text-white mb-2">Test Results</h4>
                <div class="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span class="text-gray-400">Findings:</span>
                    <span class="text-white ml-1">{testResults.findings.length}</span>
                  </div>
                  <div>
                    <span class="text-gray-400">Classification:</span>
                    <span class="text-white ml-1">{testResults.classification.levelName}</span>
                  </div>
                  <div>
                    <span class="text-gray-400">Content Length:</span>
                    <span class="text-white ml-1">{testResults.content.length} chars</span>
                  </div>
                </div>
              </div>

              {#if testResults.findings.length > 0}
                <div class="space-y-2">
                  <h5 class="font-medium text-white">Detected Issues:</h5>
                  {#each testResults.findings as finding}
                    <div class="bg-dark-700 p-3 rounded border-l-4 border-red-500">
                      <div class="flex justify-between items-start">
                        <div>
                          <span class="text-red-400 font-medium">{finding.dataType}</span>
                          <p class="text-gray-300 text-sm mt-1">
                            Found: "{finding.match}" at position {finding.position}
                          </p>
                          <p class="text-gray-400 text-xs mt-1">
                            Confidence: {Math.round(finding.confidence * 100)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              {:else}
                <div class="bg-green-400/10 border border-green-400/20 text-green-400 p-4 rounded-lg">
                  No sensitive data detected in the test content.
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  {/if}
</div>

<!-- Policy Creation/Edit Modal -->
{#if showPolicyModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-dark-800 p-6 rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
      <h3 class="text-lg font-semibold text-white mb-4">
        {selectedPolicy ? 'Edit' : 'Create'} DLP Policy
      </h3>
      
      <form on:submit|preventDefault={selectedPolicy ? updatePolicy : createPolicy} class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Name</label>
          <input
            type="text"
            bind:value={policyForm.name}
            required
            class="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <textarea
            bind:value={policyForm.description}
            required
            class="w-full h-20 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
          ></textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Data Types</label>
          <div class="grid grid-cols-2 gap-2">
            {#each dataTypeOptions as option}
              <label class="flex items-center">
                <input
                  type="checkbox"
                  bind:group={policyForm.dataTypes}
                  value={option.value}
                  class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span class="ml-2 text-sm text-gray-300">{option.label}</span>
              </label>
            {/each}
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Actions</label>
          <div class="grid grid-cols-2 gap-2">
            {#each actionOptions as option}
              <label class="flex items-center">
                <input
                  type="checkbox"
                  bind:group={policyForm.actions}
                  value={option.value}
                  class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span class="ml-2 text-sm text-gray-300">{option.label}</span>
              </label>
            {/each}
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Severity</label>
            <select
              bind:value={policyForm.severity}
              class="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
            >
              {#each severityOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </div>

          <div>
            <label class="flex items-center mt-6">
              <input
                type="checkbox"
                bind:checked={policyForm.enabled}
                class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span class="ml-2 text-sm text-gray-300">Policy Enabled</span>
            </label>
          </div>
        </div>

        <div class="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            on:click={() => { showPolicyModal = false; resetPolicyForm(); }}
            class="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            {selectedPolicy ? 'Update' : 'Create'} Policy
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Violation Resolution Modal -->
{#if showViolationModal && selectedViolation}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-dark-800 p-6 rounded-lg w-full max-w-lg mx-4">
      <h3 class="text-lg font-semibold text-white mb-4">Resolve Violation</h3>
      
      <form on:submit|preventDefault={() => resolveViolation(selectedViolation.id, 'resolved', '')} class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Resolution Notes</label>
          <textarea
            placeholder="Explain how this violation was resolved..."
            class="w-full h-20 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
          ></textarea>
        </div>

        <div class="flex justify-end space-x-3">
          <button
            type="button"
            on:click={() => { showViolationModal = false; selectedViolation = null; }}
            class="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            Resolve
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}