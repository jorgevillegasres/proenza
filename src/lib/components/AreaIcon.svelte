<script>
  // Iconos de línea sencillos para cada área. Heredan el color del texto.
  let { name, size = 28 } = $props()
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.6"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if name === 'family'}
    <circle cx="8" cy="8" r="2.4" /><circle cx="16" cy="8" r="2.4" />
    <path d="M4 19c0-2.5 1.8-4 4-4s4 1.5 4 4M12 19c0-2.5 1.8-4 4-4s4 1.5 4 4" />
  {:else if name === 'inheritance'}
    <path d="M12 3v6M5 9h14l-1.2 9.5a2 2 0 0 1-2 1.5H8.2a2 2 0 0 1-2-1.5L5 9z" /><path d="M9 13h6" />
  {:else if name === 'contract'}
    <path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /><path d="M9.5 12h5M9.5 15.5h5" />
  {:else if name === 'property'}
    <path d="M4 11l8-6 8 6" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" />
  {:else if name === 'obligation'}
    <circle cx="12" cy="12" r="8" /><path d="M12 8v8M9.5 10h3.2a1.6 1.6 0 0 1 0 3.2H10" />
  {:else if name === 'liability'}
    <path d="M12 3l8 3v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z" /><path d="M9.5 12l1.8 1.8 3.3-3.6" />
  {:else if name === 'person'}
    <circle cx="12" cy="8" r="3.2" /><path d="M5.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
  {:else}
    <circle cx="12" cy="12" r="8" />
  {/if}
</svg>
