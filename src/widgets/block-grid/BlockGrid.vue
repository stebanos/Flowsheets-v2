<template>
    <div class="relative h-screen w-screen overflow-hidden grid-pattern bg-repeat bg-position-[0_0]"></div>
</template>

<style scoped>
.grid-pattern {
    background-image:
        linear-gradient(to right, #e6e6e6 1px, transparent 1px attr(data-cell-width px)),
        linear-gradient(to bottom, #e6e6e6 1px, transparent 1px attr(data-cell-height px));
    background-size: attr(data-cell-width px) attr(data-cell-height px);
}
</style>
