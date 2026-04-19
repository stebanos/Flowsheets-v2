<template>
    <div class="relative z-1200 flex items-center h-10 px-3 bg-gray-900 text-white shrink-0">
        <div class="flex items-center gap-1.5 min-w-0">
            <slot name="nav" />
        </div>
        <div class="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs pointer-events-none max-w-[50%] overflow-hidden">
            <slot name="title" />
        </div>
        <div class="flex items-center gap-1 shrink-0 ml-auto">
            <slot name="controls" />
        </div>
    </div>
</template>
