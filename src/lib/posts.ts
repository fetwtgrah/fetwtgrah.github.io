import { getCollection } from 'astro:content';
export async function getPosts() {
  return (await getCollection('posts', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}
export const postUrl = (id: string) => `/posts/${id}/`;
export const tagUrl = (tag: string) => `/tags/${encodeURIComponent(tag)}/`;
// An estimate for mixed Chinese/English notes, including time spent reading code.
export function readingMinutes(body = '') {
  const text = body.replace(/https?:[/][/][^ )>]+/g, '');
  const chinese = (text.match(/[一-鿿㐀-䶿]/gu) ?? []).length;
  const words = (text.match(/[a-zA-Z0-9_]+/g) ?? []).length;
  return Math.max(1, Math.ceil(chinese / 300 + words / 200));
}
export const formatDate = (date: Date) => new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Shanghai' }).format(date).replaceAll('/', '.');
