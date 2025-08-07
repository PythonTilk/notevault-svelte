<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  export let data: { x: string | number, y: number }[] = [];
  export let width = 400;
  export let height = 300;
  export let color = '#3B82F6';
  export let strokeWidth = 2;
  export let showDots = true;
  export let showGrid = true;
  export let animate = true;
  export let title = '';

  const dispatch = createEventDispatcher();
  let svgElement: SVGElement;
  let pathElement: SVGPathElement;

  $: padding = { top: 20, right: 20, bottom: 40, left: 50 };
  $: chartWidth = width - padding.left - padding.right;
  $: chartHeight = height - padding.top - padding.bottom;

  // Calculate scales
  $: xValues = data.map(d => typeof d.x === 'string' ? new Date(d.x).getTime() : d.x);
  $: yValues = data.map(d => d.y);
  $: xMin = Math.min(...xValues);
  $: xMax = Math.max(...xValues);
  $: yMin = Math.min(0, Math.min(...yValues));
  $: yMax = Math.max(...yValues);

  $: xScale = (x: number) => ((x - xMin) / (xMax - xMin)) * chartWidth;
  $: yScale = (y: number) => chartHeight - ((y - yMin) / (yMax - yMin)) * chartHeight;

  // Generate path
  $: pathData = data.length > 0 
    ? `M ${xScale(xValues[0])} ${yScale(yValues[0])} ` + 
      data.slice(1).map((d, i) => `L ${xScale(xValues[i + 1])} ${yScale(yValues[i + 1])}`).join(' ')
    : '';

  // Grid lines
  $: yTicks = generateTicks(yMin, yMax, 5);
  $: xTicks = generateTicks(xMin, xMax, 5);

  function generateTicks(min: number, max: number, count: number) {
    const step = (max - min) / (count - 1);
    return Array.from({ length: count }, (_, i) => min + i * step);
  }

  function formatValue(value: number, isDate = false): string {
    if (isDate) {
      return new Date(value).toLocaleDateString();
    }
    return value.toLocaleString();
  }

  function handleMouseMove(event: MouseEvent) {
    const rect = svgElement.getBoundingClientRect();
    const x = event.clientX - rect.left - padding.left;
    const y = event.clientY - rect.top - padding.top;
    
    // Find closest data point
    const xValue = (x / chartWidth) * (xMax - xMin) + xMin;
    let closestIndex = 0;
    let closestDistance = Math.abs(xValues[0] - xValue);
    
    for (let i = 1; i < xValues.length; i++) {
      const distance = Math.abs(xValues[i] - xValue);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }

    dispatch('hover', {
      index: closestIndex,
      data: data[closestIndex],
      x: event.clientX,
      y: event.clientY
    });
  }

  onMount(() => {
    if (animate && pathElement) {
      const pathLength = pathElement.getTotalLength();
      pathElement.style.strokeDasharray = pathLength.toString();
      pathElement.style.strokeDashoffset = pathLength.toString();
      
      // Animate the path
      pathElement.animate([
        { strokeDashoffset: pathLength },
        { strokeDashoffset: 0 }
      ], {
        duration: 1000,
        easing: 'ease-out'
      });
    }
  });
</script>

<div class="chart-container" style="width: {width}px; height: {height}px;">
  {#if title}
    <h3 class="chart-title text-sm font-medium text-white mb-2">{title}</h3>
  {/if}
  
  <svg
    bind:this={svgElement}
    {width}
    {height}
    viewBox="0 0 {width} {height}"
    class="chart-svg"
    on:mousemove={handleMouseMove}
    on:mouseleave={() => dispatch('leave')}
  >
    <defs>
      <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:{color};stop-opacity:0.3" />
        <stop offset="100%" style="stop-color:{color};stop-opacity:0" />
      </linearGradient>
    </defs>

    <!-- Background -->
    <rect
      x="0"
      y="0"
      {width}
      {height}
      fill="transparent"
    />

    <!-- Grid lines -->
    {#if showGrid}
      <g class="grid" opacity="0.1">
        {#each yTicks as tick}
          <line
            x1={padding.left}
            y1={padding.top + yScale(tick)}
            x2={padding.left + chartWidth}
            y2={padding.top + yScale(tick)}
            stroke="currentColor"
            stroke-width="1"
          />
        {/each}
        {#each xTicks as tick}
          <line
            x1={padding.left + xScale(tick)}
            y1={padding.top}
            x2={padding.left + xScale(tick)}
            y2={padding.top + chartHeight}
            stroke="currentColor"
            stroke-width="1"
          />
        {/each}
      </g>
    {/if}

    <!-- Chart area -->
    <g transform="translate({padding.left}, {padding.top})">
      <!-- Fill area under line -->
      {#if data.length > 0}
        <path
          d="{pathData} L {xScale(xValues[xValues.length - 1])} {chartHeight} L {xScale(xValues[0])} {chartHeight} Z"
          fill="url(#lineGradient)"
        />
      {/if}

      <!-- Line -->
      {#if data.length > 0}
        <path
          bind:this={pathElement}
          d={pathData}
          fill="none"
          stroke={color}
          stroke-width={strokeWidth}
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      {/if}

      <!-- Data points -->
      {#if showDots}
        {#each data as point, i}
          <circle
            cx={xScale(xValues[i])}
            cy={yScale(yValues[i])}
            r="4"
            fill={color}
            stroke="white"
            stroke-width="2"
            class="data-point"
          />
        {/each}
      {/if}
    </g>

    <!-- Y-axis labels -->
    <g class="y-axis">
      {#each yTicks as tick}
        <text
          x={padding.left - 10}
          y={padding.top + yScale(tick)}
          text-anchor="end"
          dominant-baseline="middle"
          class="axis-label"
          fill="currentColor"
          font-size="12"
          opacity="0.7"
        >
          {formatValue(tick)}
        </text>
      {/each}
    </g>

    <!-- X-axis labels -->
    <g class="x-axis">
      {#each xTicks as tick, i}
        <text
          x={padding.left + xScale(tick)}
          y={height - padding.bottom + 20}
          text-anchor="middle"
          class="axis-label"
          fill="currentColor"
          font-size="12"
          opacity="0.7"
        >
          {formatValue(tick, typeof data[0]?.x === 'string')}
        </text>
      {/each}
    </g>
  </svg>
</div>

<style>
  .chart-container {
    position: relative;
  }

  .chart-svg {
    overflow: visible;
    color: var(--color-text);
  }

  .data-point {
    transition: r 0.2s ease;
    cursor: pointer;
  }

  .data-point:hover {
    r: 6;
  }

  .axis-label {
    font-family: system-ui, -apple-system, sans-serif;
  }
</style>