export const getAccessToken = () => {
  const token = localStorage.getItem("token")

  if (!token) return null;

  const item = JSON.parse(token);
  const now = new Date();

  if (now.getTime() > item.expiry) {
    localStorage.removeItem(`token`);
    return null;
  }

  return item.value;
}


export const setAccessToken = (item) => {
  if (typeof item === "string") {
    localStorage.setItem("token", JSON.stringify({ value: item }))
    return
  }

  const payload = { value: item.value }
  if (item.expiry != null) {
    payload.expiry = item.expiry < 1e12 ? item.expiry * 1000 : item.expiry
  }

  localStorage.setItem("token", JSON.stringify(payload))
}

export const removeAccessToken = () => {
  localStorage.removeItem("token")
}
