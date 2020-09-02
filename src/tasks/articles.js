import { parseDate } from '../utils/dateutils.js'
import { getStat } from '../site/files.js'

export function articles({ site, files, handleProps, routePath, body } = {}) {
  let bodyFn = body

  routePath = routePath.endsWith('/') ? routePath.slice(0, -1) : routePath

  files.forEach(file => {
    let props = site.readMarkdownProperties(file) || {}

    let slug = props.slug || file.name
    slug = slug === 'index' ? '' : slug

    // Hidden
    if (file.name.startsWith('-')) {
      props.hidden = true
      slug = slug.substr(1)
    }

    // Date
    let date = parseDate(props.date, file.name) || null
    if (!date) {
      const stat = getStat(file.fullPath)
      date = stat?.mtime
    }
    props.date = date || null

    let path = `${routePath}/${slug}`
    props.path = path

    if (handleProps) {
      if (handleProps(props) === false) {
        return
      }
    }

    site.html(
      path,
      props,
      ctx => {
        ctx.markdown = site.readMarkdown(file, {path: ctx.path})
        ctx.body = bodyFn(ctx) || ctx.body
      })
  })
}
