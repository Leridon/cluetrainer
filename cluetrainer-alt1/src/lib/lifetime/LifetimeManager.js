export class LifetimeManager {
    managed = [];
    bind(...h) {
        h.forEach(h => {
            if (typeof h == "function") {
                this.managed.push(h);
            }
            else {
                this.managed.push(() => h.endLifetime());
            }
        });
        return this;
    }
    kill() {
        this.managed.forEach(h => h());
        this.managed = [];
    }
    endLifetime() {
        this.kill();
    }
}
