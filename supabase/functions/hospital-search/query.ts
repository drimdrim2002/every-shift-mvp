export function buildHospitalSearchQuery(
  apiKey: string,
  keyword: string,
  pageNo: number,
  numOfRows: number,
): URLSearchParams {
  const params = new URLSearchParams()
  params.set('serviceKey', apiKey)
  params.set('yadmNm', keyword)
  params.set('_type', 'json')
  params.set('pageNo', String(pageNo))
  params.set('numOfRows', String(numOfRows))
  return params
}
