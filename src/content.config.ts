import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// 项目详情页。frontmatter 是标题区和指标，正文是 MDX（Markdown 加插图、示意图组件）。
const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string(),
    period: z.string(),
    role: z.string(),
    stack: z.array(z.string()).min(1),
    // 导语，也是缺省的 meta description
    summary: z.string(),
    ogDescription: z.string().max(160).optional(),
    metrics: z
      .array(z.object({ value: z.string(), unit: z.string().optional(), label: z.string() }))
      .min(3)
      .max(4),
    order: z.number(),
    // 缺省按 order 循环到下一个
    next: reference('projects').optional(),
  }),
});

export const collections = { projects };
