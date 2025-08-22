<script lang="ts">
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  export let data: { label: string, value: number, color: string }[] = [];
  export let size = 200;
  export let innerRadius = 0.6;
  export let showLabels = true;
  export let showValues = true;
  export let animate = true;
  export let title = '';

  const dispatch = createEventDispatcher();
  let svgElement: SVGElement;
  let pathElements: SVGPathElement[] = [];

  $: radius = size / 2 - 10;
  $: innerR = radius * innerRadius;
  $: total = data.reduce((sum, item) => sum + item.value, 0);
  
  // Calculate angles for each segment
  $: segments = data.map((item, index) => {
    const percentage = item.value / total;
    const angle = percentage * 2 * Math.PI;
    const startAngle = data.slice(0, index).reduce((sum, prev) => sum + (prev.value / total) * 2 * Math.PI, 0);
    const endAngle = startAngle + angle;
    
    return {
      ...item,
      percentage,
      angle,
      startAngle,
      endAngle,
      path: createArcPath(size/2, size/2, radius, innerR, startAngle, endAngle),
      centerAngle: startAngle + angle / 2
    };
  });

  function createArcPath(x: number, y: number, outerR: number, innerR: number, startAngle: number, endAngle: number): string {
    const x1 = x + outerR * Math.cos(startAngle);
    const y1 = y + outerR * Math.sin(startAngle);
    const x2 = x + outerR * Math.cos(endAngle);
    const y2 = y + outerR * Math.sin(endAngle);
    const x3 = x + innerR * Math.cos(endAngle);
    const y3 = y + innerR * Math.sin(endAngle);
    const x4 = x + innerR * Math.cos(startAngle);
    const y4 = y + innerR * Math.sin(startAngle);
    
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    
    return [
      'M', x1, y1,
      'A', outerR, outerR, 0, largeArc, 1, x2, y2,
      'L', x3, y3,
      'A', innerR, innerR, 0, largeArc, 0, x4, y4,
      'Z'
    ].join(' ');
  }

  function getLabelPosition(segment: any, offset = 20) {
    const labelRadius = radius + offset;
    const x = size/2 + labelRadius * Math.cos(segment.centerAngle - Math.PI/2);
    const y = size/2 + labelRadius * Math.sin(segment.centerAngle - Math.PI/2);
    return { x, y };
  }

  function handleSegmentClick(segment: any, index: number) {
    dispatch('segmentClick', { segment, index });
  }

  function handleSegmentHover(segment: any, index: number, event: MouseEvent) {
    dispatch('hover', {
      segment,
      index,
      x: event.clientX,
      y: event.clientY
    });
  }

  onMount(() => {
    if (animate) {
      pathElements.forEach((path, index) => {
        if (path) {
          const finalPath = segments[index].path;
          
          // Start with a zero-angle arc
          const zeroPath = createArcPath(size/2, size/2, radius, innerR, 0, 0);
          path.setAttribute('d', zeroPath);
          
          setTimeout(() => {
            path.animate([
              { d: zeroPath },
              { d: finalPath }
            ], {
              duration: 800,
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

<div class="chart-container" style="width: {size + 100}px; height: {size + 40}px;">
  {#if title}
    <h3 class="chart-title text-sm font-medium text-white mb-2 text-center">{title}</h3>
  {/if}
  
  <div class="flex items-start space-x-6">
    <svg
      bind:this={svgElement}
      width={size}
      height={size}
      viewBox="0 0 {size} {size}"
      class="chart-svg"
    >
      <!-- Segments -->
      {#each segments as segment, i}
        <path
          bind:this={pathElements[i]}
          d={segment.path}
          fill={segment.color}
          class="segment"
          on:click={() => handleSegmentClick(segment, i)}
          on:mouseenter={(e) => handleSegmentHover(segment, i, e)}
          on:mouseleave={() => dispatch('leave')}
        />
      {/each}

      <!-- Center content -->
      {#if innerRadius > 0}
        <g class="center-content">
          <text
            x={size/2}
            y={size/2 - 5}
            text-anchor="middle"
            dominant-baseline="middle"
            class="center-value"
            fill="currentColor"
            font-size="24"
            font-weight="bold"
          >
            {total.toLocaleString()}
          </text>
          <text
            x={size/2}
            y={size/2 + 15}
            text-anchor="middle"
            dominant-baseline="middle"
            class="center-label"
            fill="currentColor"
            font-size="12"
            opacity="0.7"
          >
            Total
          </text>
        </g>
      {/if}

      <!-- Labels -->
      {#if showLabels}
        {#each segments as segment, i}
          {#if segment.percentage > 0.05}
            {@const labelPos = getLabelPosition(segment)}
            <g class="label-group">
              <!-- Label line -->
              <line
                x1={size/2 + (radius - 5) * Math.cos(segment.centerAngle - Math.PI/2)}
                y1={size/2 + (radius - 5) * Math.sin(segment.centerAngle - Math.PI/2)}
                x2={labelPos.x - (labelPos.x > size/2 ? 20 : -20)}
                y2={labelPos.y}
                stroke="currentColor"
                stroke-width="1"
                opacity="0.3"
              />
              
              <!-- Label text -->
              <text
                x={labelPos.x}
                y={labelPos.y - 5}
                text-anchor={labelPos.x > size/2 ? 'start' : 'end'}
                class="segment-label"
                fill="currentColor"
                font-size="12"
                font-weight="500"
              >
                {segment.label}
              </text>
              
              {#if showValues}
                <text
                  x={labelPos.x}
                  y={labelPos.y + 10}
                  text-anchor={labelPos.x > size/2 ? 'start' : 'end'}
                  class="segment-value"
                  fill="currentColor"
                  font-size="11"
                  opacity="0.7"
                >
                  {segment.value.toLocaleString()} ({(segment.percentage * 100).toFixed(1)}%)
                </text>
              {/if}
            </g>
          {/if}
        {/each}
      {/if}
    </svg>

    <!-- Legend -->
    <div class="legend">
      {#each segments as segment, i}
        <div 
          class="legend-item flex items-center space-x-2 py-1 cursor-pointer hover:opacity-75"
          on:click={() => handleSegmentClick(segment, i)}
        >
          <div
            class="w-3 h-3 rounded-full"
            style="background-color: {segment.color}"
          ></div>
          <span class="text-sm text-white">{segment.label}</span>
          <span class="text-xs text-dark-400 ml-auto">
            {(segment.percentage * 100).toFixed(1)}%
          </span>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .chart-container {
    position: relative;
  }

  .chart-svg {
    color: var(--color-text);
  }

  .segment {
    transition: opacity 0.2s ease, transform 0.2s ease;
    cursor: pointer;
    transform-origin: center;
  }

  .segment:hover {
    opacity: 0.8;
    transform: scale(1.02);
  }

  .center-value,
  .center-label,
  .segment-label,
  .segment-value {
    font-family: system-ui, -apple-system, sans-serif;
    pointer-events: none;
  }

  .legend {
    min-width: 120px;
  }

  .legend-item {
    transition: opacity 0.2s ease;
  }
</style>