import type { FormItemRule } from "naive-ui";

// 普通文本
export const textRule: FormItemRule = {
  required: true,
  message: "Please fill in required information",
  trigger: ["blur"],
};

// 数字验证
export const numberRule: FormItemRule = {
  required: true,
  type: "number",
  message: "Please enter a number",
  trigger: ["input", "blur"],
};

// 邮箱验证
export const emailRule: FormItemRule = {
  required: true,
  message: "Please enter a valid email",
  trigger: ["input", "blur"],
  validator: (_: FormItemRule, value: any) => {
    if (!value) return new Error("Please enter an email address");
    else if (
      !/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
        value,
      )
    ) {
      return new Error("Please enter a valid email address");
    }
    return true;
  },
};

// 手机号验证
export const phoneRule: FormItemRule = {
  required: true,
  type: "number",
  message: "Please enter a valid phone number",
  trigger: ["input", "blur"],
  validator: (_: FormItemRule, value: any) => {
    if (!value) return new Error("Please enter a phone number");
    else if (!/^1(3\d|4[5-9]|5[0-35-9]|6[567]|7[0-8]|8\d|9[0-35-9])\d{8}$/.test(value)) {
      return new Error("Please enter a valid phone number");
    }
    return true;
  },
};
