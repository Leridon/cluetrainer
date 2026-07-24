export var LifetimeManaged;
(function (LifetimeManaged) {
    function wrap(e, f) {
        return new class {
            endLifetime() {
                f(e);
            }
        };
    }
    LifetimeManaged.wrap = wrap;
})(LifetimeManaged || (LifetimeManaged = {}));
