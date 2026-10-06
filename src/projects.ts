import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from './i18n';

// 中文稿在 src/content/projects/<id>.mdx，英文稿在 src/content/projects/en/<id>.mdx（id 是 en/<id>）。
// 两种语言的地址都取文件名部分：/fydeos/、/en/fydeos/。

export type Project = CollectionEntry<'projects'>;

export const slugOf = (entry: Project) => entry.id.replace(/^en\//, '');

// 某种语言的全部项目，按 order 排好
export const projectsFor = async (lang: Lang) =>
  (await getCollection('projects', (entry) => entry.id.startsWith('en/') === (lang === 'en'))).sort(
    (a, b) => a.data.order - b.data.order,
  );

// 详情页的 getStaticPaths：每个项目一页，缺省的下一个项目按 order 循环
export const projectPaths = async (lang: Lang) => {
  const projects = await projectsFor(lang);
  return projects.map((entry, i) => ({
    params: { project: slugOf(entry) },
    props: { entry, next: projects[(i + 1) % projects.length] },
  }));
};
