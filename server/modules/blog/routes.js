const express = require('express');
const {HttpError} = require('../../errors');

function blogRoutes({repos}) {
    const router = express.Router();

    router.get('/posts', async (req, res) => {
        const posts = await repos.blog.list();
        res.json({posts: posts.map(({body, ...preview}) => preview)});
    });

    router.get('/posts/:slug', async (req, res) => {
        const post = await repos.blog.findBySlug(req.params.slug);
        if (!post) throw new HttpError(404, 'Статья не найдена');
        res.json({post});
    });

    return router;
}

module.exports = {blogRoutes};
