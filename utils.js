const fs = require('fs');
const path = require('path');

module.exports = {
    makePath: function(_path) {
        const dir = path.parse(_path).dir;

        let cd = '';

        dir.split(/\/|\\/).forEach(dir => {
            if (!dir) {
                return;
            }

            cd = cd ? path.join(cd, dir) : dir;

            if (!fs.existsSync(cd)) {
                fs.mkdirSync(cd);
            }
        });
    }
};
