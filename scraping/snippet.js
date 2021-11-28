async function getPageHtml(url) {
  return new Promise((resolve, reject) =>
    fetch(url)
      .then((r) => r.text())
      .then((pageStr) => {
        const doc = document.createElement('html')
        doc.innerHTML = pageStr
        resolve(doc)
      })
      .catch(reject)
  )
}

function evalAndReturn(codeStr, variablesToExtract = []) {
  const prepared = [
    '(() => {',
    codeStr,
    `return { ${variablesToExtract} }})()`,
  ].join('')

  return eval(prepared)
}

function mapRestaurant(r) {
  return { [r[0]]: [r[4] + (r[5] ? ' ' + r[5] : ''), r[38], r[16], r[17]] }
}

function mapPolygon(polygon) {
  return polygon.map((polygon) => {
    return (polygon.coordinates || [])
      .slice(9, -2)
      .split(',')
      .map((a) => a.split(' ').map(parseFloat).reverse())
  })
}

;(async function () {
  const plzs =
    '04103, 04105, 04107, 04109, 04129, 04155, 04157, 04158, 04159, 04177, 04178, 04179, 04205, 04207, 04209, 04229, 04249, 04275, 04277, 04279, 04288, 04289, 04299, 04315, 04316, 04317, 04318, 04319, 04328, 04329, 04347, 04349, 04356, 04357'
      .split(', ')
      .map((p) => '' + p)

  const promises = plzs.map(async (plz) => {
    const html = await getPageHtml(
      'https://www.lieferando.de/lieferservice/essen/leipzig-' + plz
    )

    try {
      const script = html.querySelectorAll('script')[6]

      if (!script) {
        console.log(html.innerHTML)
        throw Error('Unvalid script scraped!')
      }

      return evalAndReturn(script.innerText, ['restaurants', 'polygons'])
    } catch (e) {
      throw Error(e.message + ': in PLZ' + plz)
    }
  })

  Promise.all(promises).then((resultsPerPage) => {
    const all = {
      restaurants: {},
      polygons: {},
    }

    resultsPerPage.forEach(({ restaurants, polygons }) => {
      restaurants.forEach((restaurant) => {
        Object.assign(all.restaurants, mapRestaurant(restaurant))
      })

      for (let restoId in polygons) {
        all.polygons[restoId] = mapPolygon(polygons[restoId])
      }
    })

    console.log(
      `const polygons = ${JSON.stringify(all.polygons, null)}
       const restaurants = ${JSON.stringify(all.restaurants, null)}
      `
    )
  })
})()
