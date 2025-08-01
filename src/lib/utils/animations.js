import { browser } from '$app/environment';
import { a11yPreferences } from './accessibility.js';

// Animation configuration
export const animationConfig = {
  // Duration presets (in milliseconds)
  durations: {
    instant: 0,
    fast: 150,
    normal: 300,
    slow: 500,
    slower: 800
  },
  
  // Easing functions
  easings: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
  },
  
  // Animation scales based on user preferences
  scales: {
    none: 0,
    reduced: 0.5,
    normal: 1,
    enhanced: 1.5
  }
};

// Get animation scale based on user preferences
export function getAnimationScale() {
  if (!browser) return animationConfig.scales.normal;
  
  if (a11yPreferences.prefersReducedMotion()) {
    return animationConfig.scales.reduced;
  }
  
  return animationConfig.scales.normal;
}

// Get scaled duration
export function getScaledDuration(duration) {
  const scale = getAnimationScale();
  return duration * scale;
}

// Fade animations
export const fadeAnimations = {
  in: (node, { duration = animationConfig.durations.normal, easing = animationConfig.easings.easeOut } = {}) => {
    const scaledDuration = getScaledDuration(duration);
    
    return {
      duration: scaledDuration,
      easing,
      css: t => `opacity: ${t}; transform: translateY(${(1 - t) * 10}px);`
    };
  },
  
  out: (node, { duration = animationConfig.durations.fast, easing = animationConfig.easings.easeIn } = {}) => {
    const scaledDuration = getScaledDuration(duration);
    
    return {
      duration: scaledDuration,
      easing,
      css: t => `opacity: ${t}; transform: translateY(${(1 - t) * -10}px);`
    };
  }
};

// Slide animations
export const slideAnimations = {
  left: (node, { duration = animationConfig.durations.normal, easing = animationConfig.easings.easeOut } = {}) => {
    const scaledDuration = getScaledDuration(duration);
    
    return {
      duration: scaledDuration,
      easing,
      css: t => `transform: translateX(${(t - 1) * 100}%); opacity: ${t};`
    };
  },
  
  right: (node, { duration = animationConfig.durations.normal, easing = animationConfig.easings.easeOut } = {}) => {
    const scaledDuration = getScaledDuration(duration);
    
    return {
      duration: scaledDuration,
      easing,
      css: t => `transform: translateX(${(1 - t) * 100}%); opacity: ${t};`
    };
  },
  
  up: (node, { duration = animationConfig.durations.normal, easing = animationConfig.easings.easeOut } = {}) => {
    const scaledDuration = getScaledDuration(duration);
    
    return {
      duration: scaledDuration,
      easing,
      css: t => `transform: translateY(${(t - 1) * 100}%); opacity: ${t};`
    };
  },
  
  down: (node, { duration = animationConfig.durations.normal, easing = animationConfig.easings.easeOut } = {}) => {
    const scaledDuration = getScaledDuration(duration);
    
    return {
      duration: scaledDuration,
      easing,
      css: t => `transform: translateY(${(1 - t) * 100}%); opacity: ${t};`
    };
  }
};

// Scale animations
export const scaleAnimations = {
  in: (node, { duration = animationConfig.durations.normal, easing = animationConfig.easings.bounce } = {}) => {
    const scaledDuration = getScaledDuration(duration);
    
    return {
      duration: scaledDuration,
      easing,
      css: t => `transform: scale(${t}); opacity: ${t};`
    };
  },
  
  out: (node, { duration = animationConfig.durations.fast, easing = animationConfig.easings.easeIn } = {}) => {
    const scaledDuration = getScaledDuration(duration);
    
    return {
      duration: scaledDuration,
      easing,
      css: t => `transform: scale(${t}); opacity: ${t};`
    };
  }
};

// Flip animations
export const flipAnimations = {
  horizontal: (node, { duration = animationConfig.durations.normal, easing = animationConfig.easings.easeInOut } = {}) => {
    const scaledDuration = getScaledDuration(duration);
    
    return {
      duration: scaledDuration,
      easing,
      css: t => `transform: rotateY(${(1 - t) * 180}deg); opacity: ${t};`
    };
  },
  
  vertical: (node, { duration = animationConfig.durations.normal, easing = animationConfig.easings.easeInOut } = {}) => {
    const scaledDuration = getScaledDuration(duration);
    
    return {
      duration: scaledDuration,
      easing,
      css: t => `transform: rotateX(${(1 - t) * 180}deg); opacity: ${t};`
    };
  }
};

// Micro-interactions
export const microInteractions = {
  // Button press effect
  buttonPress: (element) => {
    if (!browser || !element) return;
    
    const scale = getAnimationScale();
    if (scale === 0) return;
    
    element.style.transform = 'scale(0.95)';
    element.style.transition = `transform ${getScaledDuration(100)}ms ${animationConfig.easings.easeOut}`;
    
    setTimeout(() => {
      element.style.transform = 'scale(1)';
    }, getScaledDuration(100));
  },
  
  // Ripple effect
  ripple: (element, event) => {
    if (!browser || !element || !event) return;
    
    const scale = getAnimationScale();
    if (scale === 0) return;
    
    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    ripple.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: 0;
      height: 0;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      animation: ripple-animation ${getScaledDuration(600)}ms ${animationConfig.easings.easeOut};
      pointer-events: none;
      z-index: 1;
    `;
    
    // Ensure parent has relative positioning
    if (getComputedStyle(element).position === 'static') {
      element.style.position = 'relative';
    }
    
    element.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, getScaledDuration(600));
  },
  
  // Shake animation for errors
  shake: (element) => {
    if (!browser || !element) return;
    
    const scale = getAnimationScale();
    if (scale === 0) return;
    
    element.style.animation = `shake-animation ${getScaledDuration(500)}ms ${animationConfig.easings.easeInOut}`;
    
    setTimeout(() => {
      element.style.animation = '';
    }, getScaledDuration(500));
  },
  
  // Pulse animation for notifications
  pulse: (element, { color = 'var(--color-primary)', duration = 1000 } = {}) => {
    if (!browser || !element) return;
    
    const scale = getAnimationScale();
    if (scale === 0) return;
    
    element.style.animation = `pulse-animation ${getScaledDuration(duration)}ms ${animationConfig.easings.easeInOut} infinite`;
    element.style.setProperty('--pulse-color', color);
    
    return () => {
      element.style.animation = '';
    };
  },
  
  // Wobble effect for interactive elements
  wobble: (element) => {
    if (!browser || !element) return;
    
    const scale = getAnimationScale();
    if (scale === 0) return;
    
    element.style.animation = `wobble-animation ${getScaledDuration(600)}ms ${animationConfig.easings.easeInOut}`;
    
    setTimeout(() => {
      element.style.animation = '';
    }, getScaledDuration(600));
  }
};

// Stagger animations for lists
export function staggerAnimation(nodes, { delay = 50, animation = fadeAnimations.in } = {}) {
  if (!browser || !nodes.length) return;
  
  const scale = getAnimationScale();
  const scaledDelay = getScaledDuration(delay);
  
  return nodes.map((node, index) => {
    const staggerDelay = index * scaledDelay * scale;
    
    return {
      ...animation(node),
      delay: staggerDelay
    };
  });
}

// Parallax scrolling effect
export function createParallaxEffect(element, { speed = 0.5, direction = 'vertical' } = {}) {
  if (!browser || !element) return () => {};
  
  const scale = getAnimationScale();
  if (scale === 0) return () => {};
  
  const handleScroll = () => {
    const scrolled = window.pageYOffset;
    const parallax = scrolled * speed * scale;
    
    if (direction === 'vertical') {
      element.style.transform = `translateY(${parallax}px)`;
    } else {
      element.style.transform = `translateX(${parallax}px)`;
    }
  };
  
  window.addEventListener('scroll', handleScroll);
  
  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
}

// Loading animations
export const loadingAnimations = {
  spinner: (element) => {
    if (!browser || !element) return;
    
    const scale = getAnimationScale();
    if (scale === 0) {
      element.textContent = 'Loading...';
      return;
    }
    
    element.style.animation = `spin-animation ${getScaledDuration(1000)}ms linear infinite`;
  },
  
  dots: (element) => {
    if (!browser || !element) return;
    
    const scale = getAnimationScale();
    if (scale === 0) {
      element.textContent = 'Loading...';
      return;
    }
    
    element.innerHTML = '<span></span><span></span><span></span>';
    element.className += ' loading-dots';
    element.style.setProperty('--dot-duration', `${getScaledDuration(600)}ms`);
  },
  
  skeleton: (element) => {
    if (!browser || !element) return;
    
    const scale = getAnimationScale();
    if (scale === 0) return;
    
    element.className += ' skeleton-loading';
    element.style.setProperty('--skeleton-duration', `${getScaledDuration(1500)}ms`);
  }
};

// Intersection Observer for scroll animations
export function createScrollAnimation(elements, animationCallback, { threshold = 0.1, rootMargin = '0px' } = {}) {
  if (!browser || !elements.length) return () => {};
  
  const scale = getAnimationScale();
  if (scale === 0) return () => {};
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animationCallback(entry.target, entry);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold, rootMargin });
  
  elements.forEach(element => observer.observe(element));
  
  return () => observer.disconnect();
}

// CSS keyframes injection
export function injectAnimationStyles() {
  if (!browser) return;
  
  const styles = `
    @keyframes ripple-animation {
      to {
        width: 200px;
        height: 200px;
        opacity: 0;
      }
    }
    
    @keyframes shake-animation {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
      20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    @keyframes pulse-animation {
      0%, 100% { 
        box-shadow: 0 0 0 0 var(--pulse-color, var(--color-primary));
        opacity: 1;
      }
      50% { 
        box-shadow: 0 0 0 10px transparent;
        opacity: 0.8;
      }
    }
    
    @keyframes wobble-animation {
      0%, 100% { transform: rotate(0deg); }
      15% { transform: rotate(5deg); }
      30% { transform: rotate(-5deg); }
      45% { transform: rotate(3deg); }
      60% { transform: rotate(-3deg); }
      75% { transform: rotate(1deg); }
    }
    
    @keyframes spin-animation {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    @keyframes skeleton-animation {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }
    
    .loading-dots {
      display: inline-flex;
      gap: 4px;
    }
    
    .loading-dots span {
      width: 8px;
      height: 8px;
      background: var(--color-primary);
      border-radius: 50%;
      animation: dot-pulse var(--dot-duration, 600ms) ease-in-out infinite;
    }
    
    .loading-dots span:nth-child(2) {
      animation-delay: calc(var(--dot-duration, 600ms) * 0.2);
    }
    
    .loading-dots span:nth-child(3) {
      animation-delay: calc(var(--dot-duration, 600ms) * 0.4);
    }
    
    @keyframes dot-pulse {
      0%, 60%, 100% { transform: scale(1); opacity: 0.6; }
      30% { transform: scale(1.2); opacity: 1; }
    }
    
    .skeleton-loading {
      background: linear-gradient(90deg, 
        var(--color-surface) 25%, 
        var(--color-border) 50%, 
        var(--color-surface) 75%
      );
      background-size: 200% 100%;
      animation: skeleton-animation var(--skeleton-duration, 1500ms) ease-in-out infinite;
    }
    
    /* Reduced motion overrides */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  `;
  
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

// Initialize animations
export function initializeAnimations() {
  if (browser) {
    injectAnimationStyles();
  }
}

export default {
  fadeAnimations,
  slideAnimations,
  scaleAnimations,
  flipAnimations,
  microInteractions,
  loadingAnimations,
  staggerAnimation,
  createParallaxEffect,
  createScrollAnimation,
  getAnimationScale,
  getScaledDuration,
  initializeAnimations
};