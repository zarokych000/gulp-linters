const {
    src,
    dest,
    series,
    parallel,
    watch
} = require('gulp');
const autoprefixer = require('gulp-autoprefixer');
const webpackStream = require('webpack-stream');
const cleanCSS = require('gulp-clean-css');
const uglify = require('gulp-uglify-es').default;
const del = require('del');
const browserSync = require('browser-sync').create();
const sass = require('gulp-sass');
const svgSprite = require('gulp-svg-sprite');
const fileInclude = require('gulp-file-include');
const sourcemaps = require('gulp-sourcemaps');
const rev = require('gulp-rev');
const revRewrite = require('gulp-rev-rewrite');
const revDel = require('gulp-rev-delete-original');
const gulpif = require('gulp-if');
const notify = require('gulp-notify');
const imagemin = require('gulp-imagemin');
const svgo = require('gulp-svgmin');
const newer = require('gulp-newer');
const rename = require('gulp-rename');
const {
    readFileSync
} = require('fs');

let isProd = false;

const svgSprites = () => {
    return src('./src/img/svg/**.svg')
        .pipe(svgo())
        .pipe(svgSprite({
            mode: {
                stack: {
                    sprite: "../sprite.svg"
                }
            },
        }))
        .pipe(dest('./dist/img'));
}

const resources = () => {
    return src('./src/resources/**')
        .pipe(dest('./dist'))
}

const images = () => {
    return src('./src/img/*.{jpg,jpeg,svg,png,gif}')
        .pipe(newer('./src/img/*.{jpg,jpeg,svg,png,gif}'))
        .pipe(imagemin())
        .pipe(dest('./dist/img'))
}

const htmlInclude = () => {
    return src(['./src/*.html'])
        .pipe(fileInclude({
            prefix: '@',
            basepath: '@file'
        }))
        .pipe(dest('./dist'))
        .pipe(browserSync.stream());
}

const styles = () => {
    return src('./src/scss/*.scss')
        .pipe(gulpif(!isProd, sourcemaps.init()))
        .pipe(sass().on("error", notify.onError()))
        .pipe(autoprefixer({
            cascade: false,
        }))
        .pipe(gulpif(isProd, cleanCSS({
            level: 2
        })))
        .pipe(rename({
            suffix: '.min',
        }))
        .pipe(gulpif(!isProd, sourcemaps.write('.')))
        .pipe(dest('./dist/css/'))
        .pipe(browserSync.stream());
};

const scripts = () => {
    return src('./src/js/script.js')
        .pipe(webpackStream({
            mode: isProd ? "production" : "development",
            output: {
                filename: 'script.js'
            },
            module: {
                rules: [{
                    test: /\.m?js$/,
                    exclude: /(node_modules|bower_components)/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-env']
                        }
                    }
                }]
            },

        }))
        .on('error', function (err) {
            console.error('WEBPACK ERROR', err);
            this.emit('end');
        })
        .pipe(gulpif(!isProd, sourcemaps.init()))
        .pipe(uglify().on("error", notify.onError()))
        .pipe(gulpif(!isProd, sourcemaps.write('.')))
        .pipe(dest('./dist/js'))
        .pipe(browserSync.stream());
}


const clean = () => {
    return del(['dist/*'])
};

const toProd = (done) => {
    isProd = true;
    done();
}


const watchFiles = () => {
    browserSync.init({
        server: {
            baseDir: './dist'
        }
    })

    watch('./src/scss/**/*.scss', styles);
    watch('./src/js/**/*.js', scripts);
    watch('./src/partials/*.html', htmlInclude);
    watch('./src/*.html', htmlInclude);
    watch('./src/img/*.{jpg,jpeg,png,svg,gif}', images);
    watch('./src/img/**/*.{jpg,jpeg,png}', images);
    watch('./src/img/svg/**.svg', svgSprites);
}

const cache = () => {
    return src('dist/**/*.{css,js,svg,png,jpg,jpeg,woff2,woff}', {
            base: 'dist'
        })
        .pipe(rev())
        .pipe(revDel())
        .pipe(dest('dist'))
        .pipe(rev.manifest('rev.json'))
        .pipe(dest('dist'));
};

const rewrite = () => {
    const manifest = readFileSync('dist/rev.json');
    src('dist/css/*.css')
        .pipe(revRewrite({
            manifest
        }))
        .pipe(dest('dist/css'));
    return src('dist/**/*.html')
        .pipe(revRewrite({
            manifest
        }))
        .pipe(dest('dist'));
}


exports.default = series(clean, parallel(htmlInclude, scripts, styles, resources, images, svgSprites), watchFiles);
exports.build = series(toProd, clean, htmlInclude, scripts, styles, resources, images, svgSprites);
exports.cache = series(cache, rewrite);