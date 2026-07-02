const CryptoJS = require('crypto-js')

function _decrypt(body) {
  console.debug('raw', body)
  // 移除包装
  const wrapper = ['**YGKJ', 'YGKJ##']
  const jsonText = (() => {
    if (body.startsWith(wrapper[0]) && body.endsWith(wrapper[1])) {
      return body.slice(wrapper[0].length, -wrapper[1].length)
    }
    return body
  })()

  var jsonObject
  try {
    jsonObject = JSON.parse(jsonText)
  } catch (error) {
    console.warn('JSON解析失败', error)
    return jsonText
  }

  const encryptData = jsonObject.jsonr?.data?.encryptResult
  // 如果没有加密数据，直接返回
  if (encryptData === undefined) {
    return jsonObject
  }

  // 解密
  const key = CryptoJS.enc.Utf8.parse("422556651C7F7B2B5C266EED06068230")
  const decryptedData = CryptoJS.AES.decrypt(encryptData, key, {
    mode: CryptoJS.mode.ECB
  })
  const decryptedText = decryptedData.toString(CryptoJS.enc.Utf8)
  jsonObject.jsonr.data = JSON.parse(decryptedText)
  return jsonObject
}

pm.response.setBody(_decrypt(pm.response.text()));
if(pm.response.headers.get('Content-Type') === 'application/octet-stream'){
  pm.response.headers.upsert('Content-Type', 'application/json');
}