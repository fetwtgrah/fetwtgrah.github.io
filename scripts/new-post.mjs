import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const [slug, title, ...tags] = process.argv.slice(2);
if (!slug || !title || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error('用法：npm run post:new -- article-slug 文章标题 标签1 标签2');
  console.error('文件名只能包含小写英文字母、数字和连字符。');
  process.exitCode = 1;
} else {
  const directory = new URL('../content/posts/', import.meta.url);
  const target = new URL(`${slug}.md`, directory);
  const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const content = [
    '---', `title: ${JSON.stringify(title)}`, 'description: ""',
    `date: ${date}`, 'draft: true', `tags: ${JSON.stringify([...new Set(tags)])}`,
    '---', '', '## 背景与问题', '',
    '<!-- 说明想解决的问题、使用场景与必要前提。 -->', '',
    '## 实践过程', '', '<!-- 写下关键步骤、代码示例与选择的原因。 -->', '',
    '## 结果与反思', '', '<!-- 记录验证结果、限制与还没解决的问题。 -->', '',
    '## 参考资料', '',
  ].join(String.fromCharCode(10));
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(target, content, { encoding: 'utf8', flag: 'wx' });
    console.log(`已创建草稿：${fileURLToPath(target)}`);
    console.log('完成正文与摘要后，将 draft 改为 false 发布。');
  } catch (error) {
    console.error(error.code === 'EEXIST' ? '同名文章已经存在，未覆盖任何内容。' : error.message);
    process.exitCode = 1;
  }
}
