const setDateMPTimezone = ({ minutes }) => {
  const date = new Date();
  const offset = -4 * 60; // -4 horas em minutos
  date.setMinutes(date.getMinutes() + offset + minutes); // ajusta o deslocamento de fuso horário
  return date.toISOString().replace("Z", "-04:00");
};

module.exports = setDateMPTimezone
