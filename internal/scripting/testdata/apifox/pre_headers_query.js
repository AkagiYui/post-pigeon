pm.request.headers.add({ key: 'Referer', value: 'https://web.chelaile.net.cn/pc_new/?src=webapp_ganzhoutraffic_pc&showHomeBack=1&hideFooter=1&showWxmpFooter=0&hideCity=0&switchCity=0&showFav=0&showLineReview=0&showFrontLoading=0&topLogoUnredirect=1&supportSubway=0&homePage=linearound&cityId=039&cityName=%E8%B5%A3%E5%B7%9E&cityVersion=0&noCheckCity=1&isEdit=1&utm_source=webapp_ganzhoutraffic_pc&showMap=1&showTopLogo=0&hideTimeTable=0&utm_medium=entrance&randomTime=1655709259186&src=webapp_ganzhoutraffic_pc&randomTime=1726707855747&src=webapp_ganzhoutraffic_pc' });

const query = pm.request.url.query;
query.add({
  key: "s",
  value: "h5",
});
query.add({
  key: "v",
  value: "3.3.19",
});
query.add({
  key: "src",
  value: "weixinapp_cx",
});
