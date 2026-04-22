<template>
    <div class="flex justify-between items-center h-10 px-3 bg-gray-900 text-white">
        <div class="flex items-center gap-1.5 shrink-0">
            <slot name="nav" />
        </div>
        <div class="flex items-center gap-1.5 pointer-events-none max-w-[50%] overflow-hidden text-xs">
            <slot name="title" />
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
            <slot name="controls" />
        </div>
    </div>
</template>
