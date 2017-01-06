module.exports = {
    "env": {
        "browser": true,
        "commonjs": true,
        "es6": true
    },
    "extends": "google",
    "installedESLint": true,
    "rules": {
        "require-jsdoc": 0,
        "new-cap": 0,
        "max-len": 1,
        "no-multiple-empty-lines": [
            "error",
            {"max": 1}
        ]
    },
};