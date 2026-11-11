const fs = require('node:fs/promises');
const path = require('node:path');

// Файловое хранилище одной JSON-коллекции. Записи сериализуются через очередь,
// а файл заменяется атомарно (tmp + rename), чтобы не получить битый JSON при сбое.
class JsonStore {
    constructor(filePath, initial) {
        this.filePath = filePath;
        this.initial = initial;
        this.data = null;
        this.queue = Promise.resolve();
    }

    async load() {
        if (this.data) return this.data;
        try {
            this.data = JSON.parse(await fs.readFile(this.filePath, 'utf8'));
        } catch (err) {
            if (err.code !== 'ENOENT') throw err;
            this.data = structuredClone(this.initial);
        }
        return this.data;
    }

    // mutator получает данные и меняет их на месте; результат mutator возвращается вызывающему
    update(mutator) {
        const run = async () => {
            const data = await this.load();
            const result = await mutator(data);
            await fs.mkdir(path.dirname(this.filePath), {recursive: true});
            const tmp = `${this.filePath}.${process.pid}.tmp`;
            await fs.writeFile(tmp, JSON.stringify(data, null, 2));
            await fs.rename(tmp, this.filePath);
            return result;
        };
        const next = this.queue.then(run, run);
        this.queue = next.catch(() => {
        });
        return next;
    }
}

module.exports = {JsonStore};
