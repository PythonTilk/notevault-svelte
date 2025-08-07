<script lang="ts">
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  export let data: { label: string, value: number, color?: string }[] = [];
  export let width = 400;
  export let height = 300;
  export let color = '#3B82F6';
  export let showValues = true;
  export let animate = true;
  export let title = '';

  const dispatch = createEventDispatcher();
  let svgElement: SVGElement;
  let barElements: SVGRectElement[] = [];

  $: padding = { top: 20, right: 20, bottom: 60, left: 50 };
  $: chartWidth = width - padding.left - padding.right;
  $: chartHeight = height - padding.top - padding.bottom;

  $: maxValue = Math.max(...data.map(d => d.value));
  $: barWidth = data.length > 0 ? chartWidth / data.length * 0.8 : 0;
  $: barSpacing = data.length > 0 ? chartWidth / data.length * 0.2 : 0;

  function getBarHeight(value: number): number {
    return (value / maxValue) * chartHeight;
  }

  function getBarX(index: number): number {
    return index * (barWidth + barSpacing) + barSpacing / 2;
  }

  function getBarY(value: number): number {
    return chartHeight - getBarHeight(value);
  }

  function handleBarClick(item: any, index: number) {
    dispatch('barClick', { item, index });
  }

  function handleBarHover(item: any, index: number, event: MouseEvent) {
    dispatch('hover', {
      item,
      index,
      x: event.clientX,
      y: event.clientY
    });
  }

  onMount(() => {
    if (animate) {
      barElements.forEach((bar, index) => {
        if (bar) {
          const finalHeight = getBarHeight(data[index].value);
          bar.style.height = '0';
          bar.style.y = chartHeight.toString();
          
          setTimeout(() => {
            bar.animate([
              { height: '0', y: chartHeight },
              { height: finalHeight, y: getBarY(data[index].value) }
            ], {
              duration: 600,
              delay: index * 100,
              easing: 'ease-out',
              fill: 'forwards'
            });
          }, 100);
        }
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
  >
    <!-- Background -->
    <rect
      x="0"
      y="0"
      {width}
      {height}
      fill="transparent"
    />

    <!-- Chart area -->
    <g transform="translate({padding.left}, {padding.top})">
      <!-- Bars -->
      {#each data as item, i}
        <g class="bar-group">
          <rect
            bind:this={barElements[i]}
            x={getBarX(i)}
            y={getBarY(item.value)}
            width={barWidth}
            height={getBarHeight(item.value)}
            fill={item.color || color}
            rx="4"
            ry="4"
            class="bar"
            on:click={(e) => handleBarClick(item, i)}
            on:mouseenter={(e) => handleBarHover(item, i, e)}
            on:mouseleave={() => dispatch('leave')}
          />

          <!-- Value labels -->
          {#if showValues && item.value > 0}
            <text
              x={getBarX(i) + barWidth / 2}
              y={getBarY(item.value) - 8}
              text-anchor="middle"
              class="value-label"
              fill="currentColor"
              font-size="12"
              font-weight="500"
              opacity="0.8"
            >
              {item.value.toLocaleString()}
            </text>
          {/if}
        </g>
      {/each}

      <!-- X-axis line -->
      <line
        x1="0"
        y1={chartHeight}
        x2={chartWidth}
        y2={chartHeight}
        stroke="currentColor"
        stroke-width="1"
        opacity="0.2"
      />
    </g>

    <!-- X-axis labels -->
    <g class="x-axis">
      {#each data as item, i}
        <text
          x={padding.left + getBarX(i) + barWidth / 2}
          y={height - padding.bottom + 20}
          text-anchor="middle"
          class="axis-label"
          fill="currentColor"
          font-size="12"
          opacity="0.7"
        >
          {item.label}
        </text>
      {/each}
    </g>

    <!-- Y-axis labels -->
    <g class="y-axis">
      {#each Array.from({length: 5}, (_, i) => (maxValue / 4) * i) as tick}
        <text
          x={padding.left - 10}
          y={padding.top + chartHeight - (tick / maxValue) * chartHeight}
          text-anchor="end"
          dominant-baseline="middle"
          class="axis-label"
          fill="currentColor"
          font-size="12"
          opacity="0.7"
        >
          {Math.round(tick).toLocaleString()}
        </text>
        
        <!-- Grid line -->
        <line
          x1={padding.left}
          y1={padding.top + chartHeight - (tick / maxValue) * chartHeight}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight - (tick / maxValue) * chartHeight}
          stroke="currentColor"
          stroke-width="1"
          opacity="0.1"
        />
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

  .bar {
    transition: opacity 0.2s ease, transform 0.2s ease;
    cursor: pointer;
  }

  .bar:hover {
    opacity: 0.8;
    transform: translateY(-2px);
  }

  .axis-label {
    font-family: system-ui, -apple-system, sans-serif;
  }

  .value-label {
    font-family: system-ui, -apple-system, sans-serif;
    pointer-events: none;
  }
</style>