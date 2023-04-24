import { generate } from '../src/prisma-generator';
import options from './data.json';
(async () => {
  await generate(options as any);
})();
