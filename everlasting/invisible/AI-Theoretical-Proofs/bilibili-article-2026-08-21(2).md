# 牛顿更新法的残余梯度理论上界

> 取自 https://arxiv.org/pdf/1911.03030

命题

## 定理 1

有一个使用 $w^\mathsf Tx$ 预测 $y$ 的线性模型 $w$，在样本 $(x_i,y_i)$ 上的 loss $\ell_i(w)=\ell(w^\mathsf Tx_i,y_i)$ 是凸函数且任意处可微，在 $D=\{(x_i,y_i)\}_{i=1}^n$ 上的 loss 定义为

$$
L(\mathbf w;D)
=
\sum_{i=1}^{n}\ell_i(\mathbf w)
+
\frac{\lambda n}{2}\|\mathbf w\|_2^2.
$$

假设对于任意 $(x_i,y_i)\in D$ 以及 $w\in\mathbb{R}^d$，都有

$$
\left\|\nabla \ell(w^\top x_i,y_i)\right\|_2\le C.
$$

且 $\ell''$ 是 $\gamma$\-Lipschitz 函数，以及对于所有 $(x_i,y_i)\in D$，都有

$\|x_i\|_2\le 1.$

记 $D'=D\backslash(x_n,y_n)$，有：

$$
\|\nabla L(w^-;D')\|_2
=
\|(H_{w_\eta}-H_{w^*})H_{w^*}^{-1}\Delta\|_2
$$

$$
\le
\gamma(n-1)\|H_{w^*}^{-1}\Delta\|_2^2
\le
\frac{4\gamma C^2}{\lambda^2(n-1)}.
$$

其中 $\Delta=-\nabla L(w^*;D')$，$H_{w^*}, H_{w_\eta}$ 分别表示 $L(\cdot;D')$ 在 $w^*$ 和

$$
w_\eta=w^*+\eta H_{w^*}^{-1}\Delta,\qquad\eta\in[0,1]
$$

处的 Hessian 矩阵

> 想证明，通过一次牛顿式删除更新得到的参数 $\mathbf w^{-}$，在删除后的数据集 $D'$ 上的残余梯度很小（从而其实很接近 $D'$ 上的最优模型）

# 命题的证明

## 定理 1

令

$$
G(\mathbf w)=\nabla L(\mathbf w;D').
$$

$G(\mathbf w^-)$ 就是快速删除后剩下的优化误差，或者说残余梯度，我们的目标就是给 $\|G(\mathbf w^-)\|_2$ 一个上界。

由于

$$
\mathbf w^-=\mathbf w^*+H_{\mathbf w^*}^{-1}\Delta,
$$

在 $\mathbf w^*$ 附近对 $G$ 展开。由泰勒定理，在线段 $\mathbf w^*$ 到 $\mathbf w^-$ 之间存在某个点

$$
\mathbf w_\eta
=
\mathbf w^*
+
\eta H_{\mathbf w^*}^{-1}\Delta,
\qquad \eta\in[0,1],
$$

使得

$$
G(\mathbf w^-)
=
G(\mathbf w^*)
+
\nabla G(\mathbf w_\eta)
H_{\mathbf w^*}^{-1}\Delta.
$$

因为 $G$ 是损失函数的梯度，所以 $G$ 的导数就是 Hessian：

$$
\nabla G(\mathbf w_\eta)
=
\nabla^2L(\mathbf w_\eta;D')
=
H_{\mathbf w_\eta}.
$$

因此：

$$
G(\mathbf w^-)
=
G(\mathbf w^*)
+
H_{\mathbf w_\eta}H_{\mathbf w^*}^{-1}\Delta.
$$

由于有：

$$
G(\mathbf w^*)=-\Delta.
$$

因此：

$$
\begin{aligned}
G(\mathbf w^-)
&=
G(\mathbf w^*)
+
H_{\mathbf w_\eta}H_{\mathbf w^*}^{-1}\Delta\\
&=
-\Delta
+
H_{\mathbf w_\eta}H_{\mathbf w^*}^{-1}\Delta.
\end{aligned}
$$

又因为

$$
\Delta
=
H_{\mathbf w^*}H_{\mathbf w^*}^{-1}\Delta,
$$

所以：

$$
\begin{aligned}
G(\mathbf w^-)
&=
H_{\mathbf w_\eta}H_{\mathbf w^*}^{-1}\Delta
-
H_{\mathbf w^*}H_{\mathbf w^*}^{-1}\Delta\\
&=
\boxed{
(H_{\mathbf w_\eta}-H_{\mathbf w^*})
H_{\mathbf w^*}^{-1}\Delta
}.
\end{aligned}
$$

事实上，如果 Hessian 完全不随参数变化，即

$$
H_{\mathbf w_\eta}=H_{\mathbf w^*},
$$

那么

$$
G(\mathbf w^-)=0.
$$

也就是说，如果目标函数是二次函数，一次牛顿更新就会精确到达删除后目标的最优点。

一般情况下，更新后还剩下的梯度完全来自：

$$
H_{\mathbf w_\eta}-H_{\mathbf w^*},
$$

也就是移动过程中目标函数曲率发生的变化。所以接下来控制 Hessian 的变化。

由次乘性：

$$
\|A\mathbf v\|_2
\le
\|A\|_2\|\mathbf v\|_2,
$$

得到：

$$
\|G(\mathbf w^-)\|_2
\le
\|H_{\mathbf w_\eta}-H_{\mathbf w^*}\|_2
\,
\|H_{\mathbf w^*}^{-1}\Delta\|_2.
$$

因此，接下来只需要控制 Hessian 差：

$$
\|H_{\mathbf w_\eta}-H_{\mathbf w^*}\|_2.
$$

由于 loss 是：

$$
L(\mathbf w;D')
=
\sum_{i=1}^{n-1}\ell_i(\mathbf w)
+
\frac{\lambda(n-1)}{2}\|\mathbf w\|_2^2.
$$

它的 Hessian 是

$$
H_{\mathbf w}
=
\sum_{i=1}^{n-1}\nabla^2\ell_i(\mathbf w)
+
\lambda(n-1)I.
$$

所以两个参数点处的 Hessian 之差为

$$
\begin{aligned}
H_{\mathbf w_\eta}-H_{\mathbf w^*}
&=
\sum_{i=1}^{n-1}
\left[
\nabla^2\ell_i(\mathbf w_\eta)
-
\nabla^2\ell_i(\mathbf w^*)
\right]
\end{aligned}
$$

因此只需要放缩

$$
\nabla^2\ell_i(\mathbf w_\eta)
-
\nabla^2\ell_i(\mathbf w^*).
$$

对于线性预测分数

$$
z=\mathbf w^\top\mathbf x_i,
$$

单样本损失对参数 $\mathbf w$ 的 Hessian 为：

$$
\nabla_{\mathbf w}^2
\ell(\mathbf w^\top\mathbf x_i,y_i)
=
\ell''(\mathbf w^\top\mathbf x_i,y_i)
\mathbf x_i\mathbf x_i^\top.
$$

因此，在 $\mathbf w_\eta$ 和 $\mathbf w^*$ 两点处的 Hessian 差为：

$$
\begin{aligned}
&
\nabla^2\ell(\mathbf w_\eta^\top\mathbf x_i,y_i)
-
\nabla^2\ell((\mathbf w^*)^\top\mathbf x_i,y_i)
\\
&=
\left[
\ell''(\mathbf w_\eta^\top\mathbf x_i,y_i)
-
\ell''((\mathbf w^*)^\top\mathbf x_i,y_i)
\right]
\mathbf x_i\mathbf x_i^\top.
\end{aligned}
$$

取谱范数：

$$
\begin{aligned}
&
\left\|
\nabla^2\ell(\mathbf w_\eta^\top\mathbf x_i,y_i)
-
\nabla^2\ell((\mathbf w^*)^\top\mathbf x_i,y_i)
\right\|_2
\\
&\le
\left|
\ell''(\mathbf w_\eta^\top\mathbf x_i,y_i)
-
\ell''((\mathbf w^*)^\top\mathbf x_i,y_i)
\right|
\|\mathbf x_i\mathbf x_i^\top\|_2.
\end{aligned}
$$

对于外积矩阵：

$$
\|\mathbf x_i\mathbf x_i^\top\|_2
=
\|\mathbf x_i\|_2^2.
$$

由于假设

$$
\|\mathbf x_i\|_2\le 1,
$$

所以

$$
\|\mathbf x_i\mathbf x_i^\top\|_2\le1.
$$

假设 $\ell''$ 是 $\gamma$\-Lipschitz，意味着：

$$
|\ell''(a,y)-\ell''(b,y)|
\le
\gamma|a-b|.
$$

取

$$
a=\mathbf w_\eta^\top\mathbf x_i,
\qquad
b=(\mathbf w^*)^\top\mathbf x_i,
$$

则：

$$
\begin{aligned}
&
\left|
\ell''(\mathbf w_\eta^\top\mathbf x_i,y_i)
-
\ell''((\mathbf w^*)^\top\mathbf x_i,y_i)
\right|
\\
&\le
\gamma
|(\mathbf w_\eta-\mathbf w^*)^\top\mathbf x_i|.
\end{aligned}
$$

由 Cauchy–Schwarz 不等式：

$$
|(\mathbf w_\eta-\mathbf w^*)^\top\mathbf x_i|
\le
\|\mathbf w_\eta-\mathbf w^*\|_2
\|\mathbf x_i\|_2
\le
\|\mathbf w_\eta-\mathbf w^*\|_2.
$$

因此，单个样本的 Hessian 变化满足：

$$
\left\|
\nabla^2\ell_i(\mathbf w_\eta)
-
\nabla^2\ell_i(\mathbf w^*)
\right\|_2
\le
\gamma\|\mathbf w_\eta-\mathbf w^*\|_2.
$$

而

$$
\mathbf w_\eta-\mathbf w^*
=
\eta H_{\mathbf w^*}^{-1}\Delta,
$$

并且 $0\le\eta\le1$，所以：

$$
\|\mathbf w_\eta-\mathbf w^*\|_2
\le
\|H_{\mathbf w^*}^{-1}\Delta\|_2.
$$

最终得到：

$$
\left\|
\nabla^2\ell_i(\mathbf w_\eta)
-
\nabla^2\ell_i(\mathbf w^*)
\right\|_2
\le
\gamma
\|H_{\mathbf w^*}^{-1}\Delta\|_2.
$$

由三角不等式：

$$
\begin{aligned}
\|H_{\mathbf w_\eta}-H_{\mathbf w^*}\|_2
&=
\left\|\sum_{i=1}^{n-1}
\left[
\nabla^2\ell_i(\mathbf w_\eta)
-
\nabla^2\ell_i(\mathbf w^*)
\right]\right\|_2\\
&\le
\sum_{i=1}^{n-1}
\left\|
\nabla^2\ell_i(\mathbf w_\eta)
-
\nabla^2\ell_i(\mathbf w^*)
\right\|_2\\
&\le
\gamma(n-1)
\|H_{\mathbf w^*}^{-1}\Delta\|_2.
\end{aligned}
$$

代回前面的残余梯度界：

$$
\begin{aligned}
\|G(\mathbf w^-)\|_2
&\le
\|H_{\mathbf w_\eta}-H_{\mathbf w^*}\|_2
\|H_{\mathbf w^*}^{-1}\Delta\|_2\\
&\le
\gamma(n-1)
\|H_{\mathbf w^*}^{-1}\Delta\|_2^2.
\end{aligned}
$$

于是得到定理的中间结论：

$$
\boxed{
\|\nabla L(\mathbf w^-;D')\|_2
\le
\gamma(n-1)
\|H_{\mathbf w^*}^{-1}\Delta\|_2^2
}
$$

这里出现平方说明，一次牛顿更新已经消除了主要的一阶误差，剩下的是二阶误差。

现在需要估计：

$$
\|H_{\mathbf w^*}^{-1}\Delta\|_2.
$$

由范数次乘性：

$$
\|H_{\mathbf w^*}^{-1}\Delta\|_2
\le
\|H_{\mathbf w^*}^{-1}\|_2\|\Delta\|_2.
$$

所以分别估计：

1.  $\|H_{\mathbf w^*}^{-1}\|_2$；
    
2.  $\|\Delta\|_2$。
    

由于 $\ell_i$ 是凸的，从而

$$
\nabla_{\mathbf w}^2
\ell(\mathbf w^\top\mathbf x_i,y_i)
=
\ell''(\mathbf w^\top\mathbf x_i,y_i)
\mathbf x_i\mathbf x_i^\top.
$$

是半正定的，进而 $L(\cdot;D')$ 是 $\lambda(n-1)$\-强凸的，因此：

$$
H_{\mathbf w^*}
\succeq
\lambda(n-1)I.
$$

也就是说，Hessian 的最小特征值满足：

$$
\lambda_{\min}(H_{\mathbf w^*})
\ge
\lambda(n-1).
$$

因此：

$$
\|H_{\mathbf w^*}^{-1}\|_2
=
\frac{1}{\lambda_{\min}(H_{\mathbf w^*})}
\le
\frac{1}{\lambda(n-1)}.
$$

根据论文的目标函数缩放，原数据集 $D$ 上的目标梯度为：

$$
\nabla L(\mathbf w;D)
=
\sum_{i=1}^{n}
\nabla\ell(\mathbf w^\top\mathbf x_i,y_i)
+
\lambda n\mathbf w.
$$

由于 $\mathbf w^*$ 是原目标的全局最优解：

$$
\nabla L(\mathbf w^*;D)=0.
$$

所以：

$$
0
=
\sum_{i=1}^{n}
\nabla\ell((\mathbf w^*)^\top\mathbf x_i,y_i)
+
\lambda n\mathbf w^*.
$$

移项：

$$
\lambda n\mathbf w^*
=
-
\sum_{i=1}^{n}
\nabla\ell((\mathbf w^*)^\top\mathbf x_i,y_i).
$$

取范数：

$$
\|\mathbf w^*\|_2
=
\frac{1}{\lambda n}
\left\|
\sum_{i=1}^{n}
\nabla\ell((\mathbf w^*)^\top\mathbf x_i,y_i)
\right\|_2.
$$

由三角不等式和单样本梯度上界：

$$
\|\nabla\ell(\mathbf w^\top\mathbf x_i,y_i)\|_2\le C,
$$

得到：

$$
\begin{aligned}
\|\mathbf w^*\|_2
&\le
\frac{1}{\lambda n}
\sum_{i=1}^{n}
\left\|
\nabla\ell((\mathbf w^*)^\top\mathbf x_i,y_i)
\right\|_2\\
&\le
\frac{nC}{\lambda n}\\
&=
\frac C\lambda.
\end{aligned}
$$

所以：

$$
\|\mathbf w^*\|_2\le\frac C\lambda
$$

然后来控制删除产生的梯度变化 $\Delta$。根据定义：

$$
\Delta
=
\lambda\mathbf w^*
+
\nabla\ell((\mathbf w^*)^\top\mathbf x_n,y_n).
$$

取范数：

$$
\|\Delta\|_2
\le
\lambda\|\mathbf w^*\|_2
+
\left\|
\nabla\ell((\mathbf w^*)^\top\mathbf x_n,y_n)
\right\|_2.
$$

利用：

$$
\|\mathbf w^*\|_2\le\frac C\lambda
$$

以及

$$
\|\nabla\ell\|_2\le C,
$$

得到：

$$
\|\Delta\|_2
\le
\lambda\frac C\lambda+C
=
2C.
$$

因此：

$$
\|\Delta\|_2\le2C
$$

现在把两个上界结合起来：

$$
\begin{aligned}
\|H_{\mathbf w^*}^{-1}\Delta\|_2
&\le
\|H_{\mathbf w^*}^{-1}\|_2\|\Delta\|_2\\
&\le
\frac{1}{\lambda(n-1)}\cdot2C\\
&=
\frac{2C}{\lambda(n-1)}.
\end{aligned}
$$

即：

$$
\|H_{\mathbf w^*}^{-1}\Delta\|_2
\le
\frac{2C}{\lambda(n-1)}
$$

此前已经证明：

$$
\|G(\mathbf w^-)\|_2
\le
\gamma(n-1)
\|H_{\mathbf w^*}^{-1}\Delta\|_2^2.
$$

代入：

$$
\|H_{\mathbf w^*}^{-1}\Delta\|_2
\le
\frac{2C}{\lambda(n-1)},
$$

得到：

$$
\begin{aligned}
\|G(\mathbf w^-)\|_2
&\le
\gamma(n-1)
\left(
\frac{2C}{\lambda(n-1)}
\right)^2\\
&=
\gamma(n-1)
\frac{4C^2}{\lambda^2(n-1)^2}\\
&=
\frac{4\gamma C^2}{\lambda^2(n-1)}.
\end{aligned}
$$

因为 $G(\mathbf w)=\nabla L(\mathbf w;D')$，最终得到：

$$
\boxed{
\|\nabla L(\mathbf w^-;D')\|_2
\le
\frac{4\gamma C^2}{\lambda^2(n-1)}
}
$$

# 前置知识

## 牛顿更新

设有一个模型 $\mathbf w$，其优化目标和最优点分别为：

$$
F_D(\mathbf w),
\qquad
\mathbf w^*=\arg\min_{\mathbf w}F_D(\mathbf w).
$$

在 $D$ 中删除样本 $x$ 后，希望找到删除后的最优解

$$
\mathbf w_{D'}^*=\arg\min_{\mathbf w}F_{D'}(\mathbf w),
$$

但又不想从头重新训练。此时，牛顿更新会：

$$
\bar{\mathbf w}
=
\mathbf w^*
-H_{\mathbf w^*}^{-1}\nabla F_{D'}(\mathbf w^*)
$$

**方法推导：**

在 $\mathbf w^*$ 附近，对删除后的梯度做一阶泰勒展开：

$$
\nabla F_{D'}(\mathbf w^*+\boldsymbol\delta)
\approx
\nabla F_{D'}(\mathbf w^*)
+
H_{\mathbf w^*}\boldsymbol\delta,
$$

其中

$$
H_{\mathbf w^*}=\nabla^2F_{D'}(\mathbf w^*)
$$

是删除后目标在 $\mathbf w^*$ 处的 Hessian。

新最优点应满足梯度为零，所以令近似梯度等于零：

$$
\nabla F_{D'}(\mathbf w^*)
+H_{\mathbf w^*}\boldsymbol\delta=0.
$$

解得

$$
\boldsymbol\delta
=-H_{\mathbf w^*}^{-1}\nabla F_{D'}(\mathbf w^*),
$$

因此牛顿更新为

$$
\boxed{
\bar{\mathbf w}
=
\mathbf w^*
-H_{\mathbf w^*}^{-1}\nabla F_{D'}(\mathbf w^*)
}
$$

为什么不能只沿负梯度方向更新？普通梯度下降会使用

$$
\boldsymbol\delta=-\alpha\nabla F_{D'}(\mathbf w^*),
$$

它只知道应该往哪个方向走，还需要选择学习率 $\alpha$。牛顿法使用

$$
\boldsymbol\delta=-H^{-1}\nabla F_{D'},
$$

其中 Hessian 描述不同参数方向上的曲率：

-   曲率大的方向，参数少移动一些；
    
-   曲率小的方向，参数多移动一些；
    
-   参数之间存在耦合时，Hessian 也会调整更新方向。
    

所以牛顿更新不是简单移动，而是在局部二次模型下直接跳到预计的最优点。
