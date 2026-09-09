

[TOC]

# unlearning

## questions

### Certified Removal

> 一个线性模型在 $\mathcal{D}$ 上训练到最优，现在希望模型在 $\mathcal{D}\backslash\{\bold{x}\}$ 上最优，怎么不重训地达到好效果？

设原目标为

\[
F_D(\mathbf w),
\qquad
\mathbf w^*=\arg\min_{\mathbf w}F_D(\mathbf w).
\]

因为 \(\mathbf w^*\) 是原目标的最优点，满足

\[
\nabla F_D(\mathbf w^*)=0.
\]

删除样本 \(x\) 后，目标函数变成

\[
F_{D'}(\mathbf w),\qquad D'=D\setminus\{x\}.
\]

原参数 \(\mathbf w^*\) 通常不再是新目标的最优点：

\[
\nabla F_{D'}(\mathbf w^*)\neq0.
\]

我们希望找到删除后真正的最优解

\[
\mathbf w_{D'}^*=\arg\min_{\mathbf w}F_{D'}(\mathbf w),
\]

但又不想从头重新训练。

在 \(\mathbf w^*\) 附近，对删除后的梯度做一阶泰勒展开：
\[
\nabla F_{D'}(\mathbf w^*+\boldsymbol\delta)
\approx
\nabla F_{D'}(\mathbf w^*)
+
H_{\mathbf w^*}\boldsymbol\delta,
\]

其中

\[
H_{\mathbf w^*}=\nabla^2F_{D'}(\mathbf w^*)
\]

是删除后目标在 \(\mathbf w^*\) 处的 Hessian。

新最优点应满足梯度为零，所以令近似梯度等于零：

\[
\nabla F_{D'}(\mathbf w^*)
+H_{\mathbf w^*}\boldsymbol\delta=0.
\]

解得

\[
\boldsymbol\delta
=-H_{\mathbf w^*}^{-1}\nabla F_{D'}(\mathbf w^*),
\]

因此牛顿更新为

\[
\boxed{
\bar{\mathbf w}
=
\mathbf w^*
-H_{\mathbf w^*}^{-1}\nabla F_{D'}(\mathbf w^*)
}
\]

为什么不能只沿负梯度方向更新？普通梯度下降会使用

\[
\boldsymbol\delta=-\alpha\nabla F_{D'}(\mathbf w^*),
\]

它只知道应该往哪个方向走，还需要选择学习率 \(\alpha\)。牛顿法使用

\[
\boldsymbol\delta=-H^{-1}\nabla F_{D'},
\]

其中 Hessian 描述不同参数方向上的曲率：

- 曲率大的方向，参数少移动一些；
- 曲率小的方向，参数多移动一些；
- 参数之间存在耦合时，Hessian 也会调整更新方向。

所以牛顿更新不是简单移动，而是在局部二次模型下直接跳到预计的最优点。

---

![image-20260712114623286](C:\Users\15951\AppData\Roaming\Typora\typora-user-images\image-20260712114623286.png)

> 想证明，通过上述一次牛顿式删除更新得到的参数 \(\mathbf w^{-}\)，在删除后数据集 \(D'\) 上的残余梯度很小（从而其实很接近 $D'$ 上的最优模型）

\[
\boxed{
\|\nabla L(\mathbf w^-;D')\|_2
\le
\frac{4\gamma C^2}{\lambda^2(n-1)}
}
\]

假设原始数据集为

\[
D=\{(\mathbf x_1,y_1),\ldots,(\mathbf x_n,y_n)\},
\]

删除第 \(n\) 个样本后：

\[
D'=D\setminus\{(\mathbf x_n,y_n)\}.
\]

因此 \(D'\) 中有 \(n-1\) 个样本。

设 \(\mathbf w^*\) 是原始数据集 \(D\) 上的最优解：

\[
\mathbf w^*=\arg\min_{\mathbf w}L(\mathbf w;D).
\]

删除一个样本后，不重新训练，而是做一次牛顿式更新：

\[
\boxed{
\mathbf w^-
=
\mathbf w^*+H_{\mathbf w^*}^{-1}\Delta
}
\]

其中：

- \(H_{\mathbf w^*}\) 是删除后目标 \(L(\cdot;D')\) 在 \(\mathbf w^*\) 处的 Hessian；
- \(\Delta\) 是删除样本后造成的梯度变化；
- \(H_{\mathbf w^*}^{-1}\Delta\) 是参数修正量。

在本文的定义下：

\[
\Delta
=
\lambda\mathbf w^*
+
\nabla\ell((\mathbf w^*)^\top\mathbf x_n,y_n).
\]

**pf:**

令

\[
G(\mathbf w)=\nabla L(\mathbf w;D').
\]

注意：

\[
G:\mathbb R^d\to\mathbb R^d
\]

是一个向量值函数。我们的目标就是控制

\[
\|G(\mathbf w^-)\|_2.
\]

如果 \(\mathbf w^-\) 是在 \(D'\) 上重新训练得到的精确最优解，那么应有

\[
G(\mathbf w^-)=0.
\]

所以 \(G(\mathbf w^-)\) 就是快速删除后剩下的优化误差，或者说**残余梯度**。

由于

\[
\mathbf w^-=\mathbf w^*+H_{\mathbf w^*}^{-1}\Delta,
\]

在 \(\mathbf w^*\) 附近对 \(G\) 展开。由泰勒定理，在线段 \(\mathbf w^*\) 到 \(\mathbf w^-\) 之间存在某个点

\[
\mathbf w_\eta
=
\mathbf w^*
+
\eta H_{\mathbf w^*}^{-1}\Delta,
\qquad \eta\in[0,1],
\]

使得

\[
G(\mathbf w^-)
=
G(\mathbf w^*)
+
\nabla G(\mathbf w_\eta)
H_{\mathbf w^*}^{-1}\Delta.
\]

因为 \(G\) 是损失函数的梯度，所以 \(G\) 的导数就是 Hessian：

\[
\nabla G(\mathbf w_\eta)
=
\nabla^2L(\mathbf w_\eta;D')
=
H_{\mathbf w_\eta}.
\]

因此：

\[
G(\mathbf w^-)
=
G(\mathbf w^*)
+
H_{\mathbf w_\eta}H_{\mathbf w^*}^{-1}\Delta.
\]

由于有：

\[
G(\mathbf w^*)=-\Delta.
\]

因此：

\[
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
\]

又因为

\[
\Delta
=
H_{\mathbf w^*}H_{\mathbf w^*}^{-1}\Delta,
\]

所以：

\[
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
\]

如果 Hessian 完全不随参数变化，即

\[
H_{\mathbf w_\eta}=H_{\mathbf w^*},
\]

那么

\[
G(\mathbf w^-)=0.
\]

也就是说，如果目标函数是二次函数，一次牛顿更新就会精确到达删除后目标的最优点。

一般情况下，更新后还剩下的梯度完全来自：

\[
H_{\mathbf w_\eta}-H_{\mathbf w^*},
\]

也就是移动过程中目标函数曲率发生的变化。所以接下来控制 Hessian 的变化。

由次乘性：

\[
\|A\mathbf v\|_2
\le
\|A\|_2\|\mathbf v\|_2,
\]

得到：

\[
\|G(\mathbf w^-)\|_2
\le
\|H_{\mathbf w_\eta}-H_{\mathbf w^*}\|_2
\,
\|H_{\mathbf w^*}^{-1}\Delta\|_2.
\]

因此，接下来只需要控制 Hessian 差：

\[
\|H_{\mathbf w_\eta}-H_{\mathbf w^*}\|_2.
\]

对于线性预测分数

\[
z=\mathbf w^\top\mathbf x_i,
\]

单样本损失对参数 \(\mathbf w\) 的 Hessian 为：

\[
\nabla_{\mathbf w}^2
\ell(\mathbf w^\top\mathbf x_i,y_i)
=
\ell''(\mathbf w^\top\mathbf x_i,y_i)
\mathbf x_i\mathbf x_i^\top.
\]

因此，在 \(\mathbf w_\eta\) 和 \(\mathbf w^*\) 两点处的 Hessian 差为：

\[
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
\]

取谱范数：

\[
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
\]

对于外积矩阵：

\[
\|\mathbf x_i\mathbf x_i^\top\|_2
=
\|\mathbf x_i\|_2^2.
\]

由于假设

\[
\|\mathbf x_i\|_2\le 1,
\]

所以

\[
\|\mathbf x_i\mathbf x_i^\top\|_2\le1.
\]

假设 \(\ell''\) 是 \(\gamma\)-Lipschitz，意味着：

\[
|\ell''(a,y)-\ell''(b,y)|
\le
\gamma|a-b|.
\]

取

\[
a=\mathbf w_\eta^\top\mathbf x_i,
\qquad
b=(\mathbf w^*)^\top\mathbf x_i,
\]

则：

\[
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
\]

由 Cauchy–Schwarz 不等式：

\[
|(\mathbf w_\eta-\mathbf w^*)^\top\mathbf x_i|
\le
\|\mathbf w_\eta-\mathbf w^*\|_2
\|\mathbf x_i\|_2
\le
\|\mathbf w_\eta-\mathbf w^*\|_2.
\]

因此，单个样本的 Hessian 变化满足：

\[
\left\|
\nabla^2\ell_i(\mathbf w_\eta)
-
\nabla^2\ell_i(\mathbf w^*)
\right\|_2
\le
\gamma\|\mathbf w_\eta-\mathbf w^*\|_2.
\]

而

\[
\mathbf w_\eta-\mathbf w^*
=
\eta H_{\mathbf w^*}^{-1}\Delta,
\]

并且 \(0\le\eta\le1\)，所以：

\[
\|\mathbf w_\eta-\mathbf w^*\|_2
\le
\|H_{\mathbf w^*}^{-1}\Delta\|_2.
\]

最终得到：

\[
\left\|
\nabla^2\ell_i(\mathbf w_\eta)
-
\nabla^2\ell_i(\mathbf w^*)
\right\|_2
\le
\gamma
\|H_{\mathbf w^*}^{-1}\Delta\|_2.
\]

整个经验风险的 Hessian 是所有样本 Hessian 的和，再加上正则项的 Hessian。

由于 loss 是：

\[
L(\mathbf w;D')
=
\sum_{i=1}^{n-1}\ell_i(\mathbf w)
+
\frac{\lambda(n-1)}{2}\|\mathbf w\|_2^2.
\]

它的 Hessian 是

\[
H_{\mathbf w}
=
\sum_{i=1}^{n-1}\nabla^2\ell_i(\mathbf w)
+
\lambda(n-1)I.
\]

所以两个参数点处的 Hessian 之差为

\[
\begin{aligned}
H_{\mathbf w_\eta}-H_{\mathbf w^*}
&=
\sum_{i=1}^{n-1}
\left[
\nabla^2\ell_i(\mathbf w_\eta)
-
\nabla^2\ell_i(\mathbf w^*)
\right]\\
&\quad+
\lambda(n-1)I-\lambda(n-1)I.
\end{aligned}
\]

由三角不等式：

\[
\begin{aligned}
\|H_{\mathbf w_\eta}-H_{\mathbf w^*}\|_2
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
\]

代回前面的残余梯度界：

\[
\begin{aligned}
\|G(\mathbf w^-)\|_2
&\le
\|H_{\mathbf w_\eta}-H_{\mathbf w^*}\|_2
\|H_{\mathbf w^*}^{-1}\Delta\|_2\\
&\le
\gamma(n-1)
\|H_{\mathbf w^*}^{-1}\Delta\|_2^2.
\end{aligned}
\]

于是得到定理的中间结论：

\[
\boxed{
\|\nabla L(\mathbf w^-;D')\|_2
\le
\gamma(n-1)
\|H_{\mathbf w^*}^{-1}\Delta\|_2^2
}
\]

这里出现平方非常重要：一次牛顿更新已经消除了主要的一阶误差，剩下的是二阶误差。

现在需要估计：

\[
\|H_{\mathbf w^*}^{-1}\Delta\|_2.
\]

由范数次乘性：

\[
\|H_{\mathbf w^*}^{-1}\Delta\|_2
\le
\|H_{\mathbf w^*}^{-1}\|_2\|\Delta\|_2.
\]

所以分别估计：

1. \(\|H_{\mathbf w^*}^{-1}\|_2\)；
2. \(\|\Delta\|_2\)。

由于 \(L(\cdot;D')\) 是 \(\lambda(n-1)\)-强凸的，因此：

\[
H_{\mathbf w^*}
\succeq
\lambda(n-1)I.
\]

也就是说，Hessian 的最小特征值满足：

\[
\lambda_{\min}(H_{\mathbf w^*})
\ge
\lambda(n-1).
\]

因此：

\[
\|H_{\mathbf w^*}^{-1}\|_2
=
\frac{1}{\lambda_{\min}(H_{\mathbf w^*})}
\le
\frac{1}{\lambda(n-1)}.
\]

根据论文的目标函数缩放，原数据集 \(D\) 上的目标梯度为：
\[
\nabla L(\mathbf w;D)
=
\sum_{i=1}^{n}
\nabla\ell(\mathbf w^\top\mathbf x_i,y_i)
+
\lambda n\mathbf w.
\]

由于 \(\mathbf w^*\) 是原目标的全局最优解：

\[
\nabla L(\mathbf w^*;D)=0.
\]

所以：

\[
0
=
\sum_{i=1}^{n}
\nabla\ell((\mathbf w^*)^\top\mathbf x_i,y_i)
+
\lambda n\mathbf w^*.
\]

移项：

\[
\lambda n\mathbf w^*
=
-
\sum_{i=1}^{n}
\nabla\ell((\mathbf w^*)^\top\mathbf x_i,y_i).
\]

取范数：

\[
\|\mathbf w^*\|_2
=
\frac{1}{\lambda n}
\left\|
\sum_{i=1}^{n}
\nabla\ell((\mathbf w^*)^\top\mathbf x_i,y_i)
\right\|_2.
\]

由三角不等式和单样本梯度上界：

\[
\|\nabla\ell(\mathbf w^\top\mathbf x_i,y_i)\|_2\le C,
\]

得到：

\[
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
\]

所以：

\[
\boxed{
\|\mathbf w^*\|_2\le\frac C\lambda
}
\]

然后来控制删除产生的梯度变化 \(\Delta\)。根据定义：
\[
\Delta
=
\lambda\mathbf w^*
+
\nabla\ell((\mathbf w^*)^\top\mathbf x_n,y_n).
\]

取范数：

\[
\|\Delta\|_2
\le
\lambda\|\mathbf w^*\|_2
+
\left\|
\nabla\ell((\mathbf w^*)^\top\mathbf x_n,y_n)
\right\|_2.
\]

利用：

\[
\|\mathbf w^*\|_2\le\frac C\lambda
\]

以及

\[
\|\nabla\ell\|_2\le C,
\]

得到：

\[
\|\Delta\|_2
\le
\lambda\frac C\lambda+C
=
2C.
\]

因此：

\[
\boxed{\|\Delta\|_2\le2C}
\]

现在把两个上界结合起来：

\[
\begin{aligned}
\|H_{\mathbf w^*}^{-1}\Delta\|_2
&\le
\|H_{\mathbf w^*}^{-1}\|_2\|\Delta\|_2\\
&\le
\frac{1}{\lambda(n-1)}\cdot2C\\
&=
\frac{2C}{\lambda(n-1)}.
\end{aligned}
\]

即：

\[
\boxed{
\|H_{\mathbf w^*}^{-1}\Delta\|_2
\le
\frac{2C}{\lambda(n-1)}
}
\]

此前已经证明：

\[
\|G(\mathbf w^-)\|_2
\le
\gamma(n-1)
\|H_{\mathbf w^*}^{-1}\Delta\|_2^2.
\]

代入：

\[
\|H_{\mathbf w^*}^{-1}\Delta\|_2
\le
\frac{2C}{\lambda(n-1)},
\]

得到：

\[
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
\]

因为 \(G(\mathbf w)=\nabla L(\mathbf w;D')\)，最终得到：

\[
\boxed{
\|\nabla L(\mathbf w^-;D')\|_2
\le
\frac{4\gamma C^2}{\lambda^2(n-1)}
}
\]

证明可以浓缩为下面这条链：

\[
\begin{aligned}
&\text{删除样本使原最优点产生梯度失衡 }-\Delta\\
&\Downarrow\\
&\text{用 }H_{\mathbf w^*}^{-1}\Delta\text{ 做一次牛顿修正}\\
&\Downarrow\\
&\text{一阶误差被精确抵消}\\
&\Downarrow\\
&\text{只剩 Hessian 随参数变化造成的二阶误差}\\
&\Downarrow\\
&\ell''\text{ 是 }\gamma\text{-Lipschitz，故 Hessian 变化可控}\\
&\Downarrow\\
&\text{强凸性保证 }H^{-1}\text{ 不会太大}\\
&\Downarrow\\
&\text{单样本梯度有界保证 }\Delta\text{ 不会太大}\\
&\Downarrow\\
&\|\nabla L(\mathbf w^-;D')\|_2
\le
\frac{4\gamma C^2}{\lambda^2(n-1)}.
\end{aligned}
\]

---

假设优化梯度上有 $\mathbf b$ 的独立随机噪声（在满足一定条件下，相当于优化目标可能随机加上 $\mathbf w^\mathsf T\mathbf b$ 的独立随机噪声）取自密度函数为 \(p(\cdot)\) 的分布，并且对于任意满足
\[
\|\mathbf b_1-\mathbf b_2\|_2\leq \epsilon'
\]
的 \(\mathbf b_1,\mathbf b_2\in\mathbb R^d\)，都有
\[
e^{-\epsilon}\leq \frac{p(\mathbf b_1)}{p(\mathbf b_2)}\leq e^\epsilon.
\]

则对于算法 \(\widetilde A\) 产生的任意解 \(\widetilde{\mathbf w}\)，有
\[
e^{-\epsilon}
\leq
\frac{f_{\widetilde A}(\widetilde{\mathbf w})}
{f_A(\widetilde{\mathbf w})}
\leq
e^\epsilon.
\]

其中，\(f_{\widetilde A}\) 和 \(f_A\) 分别表示算法 \(\widetilde A\) 与算法 \(A\) 输出解的密度函数。

> 如果训练算法是完全确定的，那么给定删除后的数据集 $D'$，完整重训会输出一个固定模型。此时，只要快速遗忘得到的参数与完整重训的参数不完全相同，两种算法的输出分布就是集中在不同点上的点质量分布，这导致输出概率比一定是 0 或 $\infty$，衡量不了快速遗忘与重训模型的接近性，也即 中证明的快速遗忘模型在 $D'$ 上的残余梯度足够小。
>
> 因此，通过在训练目标中预先加入随机扰动，可以将该残余梯度解释为噪声的偏移小，进一步证明快速遗忘与完整重训的输出分布接近。

记 \(\mathbf u=\nabla_{\mathbf w} L(\mathbf w,D')\) 为近似算法优化结束后的梯度残差，\(g_{\widetilde A}(\mathbf v)\) 为在算法 \(\widetilde A\) 下 \(\mathbf u\) 的概率密度；

中的定理 1 已经保证：

\[
\|\mathbf u\|_2\le \epsilon'.
\]

所以残差分布 \(g_{\widetilde A}\) 只在半径为 \(\epsilon'\) 的球内有概率质量。精确算法 \(A\) 的残差则恒为零，$\mathbf u=0$.

定义 $\mathbf z=\mathbf b-\mathbf u$ 来表示把残差吸收进去之后的“有效噪声”，并定义 \(q_A,q_{\widetilde A}\) 为有效噪声 \(\mathbf z\) 在两个算法下的密度。如果残差取值为 \(\mathbf u=\mathbf v\)，那么为了得到给定的 \(\mathbf z\)，原始噪声必须是

\[
\mathbf b=\mathbf z+\mathbf v.
\]

因此，对所有可能的残差 \(\mathbf v\) 积分，得到
\[
q_{\widetilde A}(\mathbf z)
=
\int g_{\widetilde A}(\mathbf v)p(\mathbf z+\mathbf v)\,d\mathbf v.
\]

这实际上是残差分布与噪声分布形成的卷积。由于残差只有在 \(\|\mathbf v\|_2\le\epsilon'\) 时才可能出现，所以积分区域可以缩小为

\[
q_{\widetilde A}(\mathbf z)
=
\int_{\|\mathbf v\|_2\le\epsilon'}
g_{\widetilde A}(\mathbf v)p(\mathbf z+\mathbf v)\,d\mathbf v.
\]

由定理假设，如果两个噪声向量的距离不超过 \(\epsilon'\)，那么它们的密度比最多相差 \(e^\epsilon\)：

\[
e^{-\epsilon}
\le
\frac{p(\mathbf b_1)}{p(\mathbf b_2)}
\le
e^\epsilon.
\]

在积分中比较 \(\mathbf z+\mathbf v\) 和 \(\mathbf z\)。因为

\[
\|(\mathbf z+\mathbf v)-\mathbf z\|_2
=
\|\mathbf v\|_2
\le\epsilon',
\]

所以

\[
p(\mathbf z+\mathbf v)
\le
e^\epsilon p(\mathbf z).
\]

代入积分（在球之外没有概率质量分布，所以第二个符号可以写成等号，哪怕积分区域扩大）：

\[
\begin{aligned}
q_{\widetilde A}(\mathbf z)
&\le
\int_{\|\mathbf v\|\le\epsilon'}
g_{\widetilde A}(\mathbf v)e^\epsilon p(\mathbf z)\,d\mathbf v\\
&=
e^\epsilon p(\mathbf z)
\int g_{\widetilde A}(\mathbf v)\,d\mathbf v\\
&=
e^\epsilon p(\mathbf z).
\end{aligned}
\]

由于 \(g_{\widetilde A}\) 是概率密度，其积分等于 1。

对于精确算法 \(A\)，梯度残差恒为零，因此

\[
\mathbf z=\mathbf b-0=\mathbf b,
\]

所以

\[
q_A(\mathbf z)=p(\mathbf z).
\]

于是得到

\[
q_{\widetilde A}(\mathbf z)
\le
e^\epsilon q_A(\mathbf z).
\]

同理，由

\[
p(\mathbf z+\mathbf v)\ge e^{-\epsilon}p(\mathbf z)
\]

可以得到下界：

\[
q_{\widetilde A}(\mathbf z)
\ge e^{-\epsilon}q_A(\mathbf z).
\]

因此，有效噪声的两个分布满足

\[
\boxed{
e^{-\epsilon}
\le
\frac{q_{\widetilde A}(\mathbf z)}{q_A(\mathbf z)}
\le
e^\epsilon
}.
\]

现在还需要从“有效噪声分布接近”推出“模型输出分布接近”。

由 $\mathbf u$ 作为残差梯度的定义：

\[
\mathbf u=\nabla L(\widetilde{\mathbf w};D')
+
\mathbf b
.
\]

定义 \(\mathbf z=\mathbf b-\mathbf u\)，可以写成

\[
\nabla L(\widetilde{\mathbf w};D')+\mathbf z=0.
\]

这正是扰动目标

\[
L(\mathbf w;D')+\mathbf z^T\mathbf w
\]

的一阶最优条件。因为这个目标是强凸的，所以对于给定的 \(\mathbf z\)，最优解是唯一的。因此存在一个确定映射 \(h\)，使得

\[
\widetilde{\mathbf w}=h(\mathbf z).
\]

换言之，只要固定有效噪声 \(\mathbf z\)，无论它来自精确算法 \(A\)，还是近似算法 \(\widetilde A\)，最终对应的模型都是同一个唯一解（因为近似算法的误差 $\mathbf u$ 被 $\mathbf z=\mathbf b-\mathbf u$ 包含在内了），因此条件分布相同：

\[
f_{\widetilde A}(\widetilde{\mathbf w}\mid\mathbf z)
=
f_A(\widetilde{\mathbf w}\mid\mathbf z).
\]

二者的输出差异完全来自 $\mathbf z$ 的分布差异，而不是给定 $\mathbf z$ 后的求解规则。

利用全概率公式：

\[
f_{\widetilde A}(\widetilde{\mathbf w})
=
\int
f_{\widetilde A}(\widetilde{\mathbf w}\mid\mathbf z)
q_{\widetilde A}(\mathbf z)\,d\mathbf z.
\]

条件分布相同，所以

\[
f_{\widetilde A}(\widetilde{\mathbf w})
=
\int
f_A(\widetilde{\mathbf w}\mid\mathbf z)
q_{\widetilde A}(\mathbf z)\,d\mathbf z.
\]

再代入

\[
q_{\widetilde A}(\mathbf z)
\le e^\epsilon q_A(\mathbf z),
\]

得到

\[
\begin{aligned}
f_{\widetilde A}(\widetilde{\mathbf w})
&\le
\int
f_A(\widetilde{\mathbf w}\mid\mathbf z)
e^\epsilon q_A(\mathbf z)\,d\mathbf z\\
&=
e^\epsilon f_A(\widetilde{\mathbf w}).
\end{aligned}
\]

同样的方法给出下界：

\[
f_{\widetilde A}(\widetilde{\mathbf w})
\ge
e^{-\epsilon}f_A(\widetilde{\mathbf w}).
\]

最终得到：

\[
\boxed{
e^{-\epsilon}
\le
\frac{f_{\widetilde A}(\widetilde{\mathbf w})}
{f_A(\widetilde{\mathbf w})}
\le
e^\epsilon
}.
\]

总的来说，删除算法的优越性不是“残差出现的概率很小”，而是残差的范数很小，使它只能把噪声向量移动一小段距离；而定理假设噪声密度在这段距离内变化不大，因此最终模型的输出密度比也接近 1。

---

假设 \(\Phi\) 是一个满足 \((\epsilon_{\mathrm{DP}},\delta_{\mathrm{DP}})\)-差分隐私的随机化学习算法，并且将 \(\Phi\) 的输出用于线性模型中，通过最小化 \(L_b\) 来训练该模型，同时采用一个能够保证 \((\epsilon_{\mathrm{CR}},\delta_{\mathrm{CR}})\)-认证删除的删除机制。那么，整个过程能够保证  
\[
(\epsilon_{\mathrm{DP}}+\epsilon_{\mathrm{CR}},
\delta_{\mathrm{DP}}+\delta_{\mathrm{CR}})
\text{-认证删除}.
\]

**证明。** 设 \(\Phi\) 是从数据集 \(\mathcal D\) 中学习特征提取器的随机化算法，并令
\[
\mu(S)=P\bigl(\Phi(\mathcal D)\in S\bigr)
\]
表示 \(\Phi\) 在所有可能的特征提取器所构成的空间 \(\Omega\) 上诱导出的概率测度。令
\[
\mathcal D'=\mathcal D\setminus\{x\}
\]
表示从数据集 \(\mathcal D\) 中删除样本 \(x\) 后得到的数据集，并令 \(\mu'(\cdot)\) 表示 \(\Phi(\mathcal D')\) 所对应的概率测度。

由于 \(\Phi\) 满足 \((\epsilon_{\mathrm{DP}},\delta_{\mathrm{DP}})\)-差分隐私，因此对于任意 \(S\subseteq\Omega\)，以概率 \(1-\delta_{\mathrm{DP}}\)，有  
\[
\mu(S)
=
P\bigl(\Phi(\mathcal D)\in S\bigr)
\leq
e^{\epsilon_{\mathrm{DP}}}
P\bigl(\Phi(\mathcal D')\in S\bigr)
=
e^{\epsilon_{\mathrm{DP}}}\mu'(S).
\]

特别地，这说明 \(\mu\) 关于 \(\mu'\) 绝对连续，因此存在 Radon–Nikodym 导数 \(g\)。此外，\(g\) 关于 \(\mu'\) 几乎处处以 \(e^{\epsilon_{\mathrm{DP}}}\) 为上界。

事实上，假设存在某个集合 \(S\subseteq\Omega\)，满足 \(\mu'(S)>0\)，并且对于某个 \(\alpha\geq 0\)，在 \(S\) 上有  
\[
g\geq e^{\epsilon_{\mathrm{DP}}}+\alpha,
\]
那么  
\[
\mu(S)
=
\int_S g\,d\mu'
\geq
\bigl(e^{\epsilon_{\mathrm{DP}}}+\alpha\bigr)\mu'(S)
\geq
\mu(S)+\alpha\mu'(S),
\]
除非 \(\alpha=0\)，否则这将导致矛盾。

最后，对于任意满足 \(\Phi(\mathcal D)=\phi\) 的 \(\phi\in\Omega\)，令 \(A(\mathcal D,\phi)\) 表示使用特征提取器 \(\phi\) 在数据集 \(\mathcal D\) 上训练模型的学习算法。假设 \(M\) 是一个满足 \((\epsilon_{\mathrm{CR}},\delta_{\mathrm{CR}})\)-认证删除的机制，那么根据 Fubini 定理，有  
\[
\begin{aligned}
&P\Bigl(
M\bigl(A(\mathcal D,\Phi(\mathcal D)),\mathcal D,x\bigr)
\in\mathcal T
\Bigr)
\\
&=
\int_{\Omega}
P\Bigl(
M\bigl(A(\mathcal D,\phi),\mathcal D,x\bigr)
\in\mathcal T
\Bigr)\,d\mu
\\
&\leq
\int_{\Omega}
e^{\epsilon_{\mathrm{CR}}}
P\bigl(A(\mathcal D',\phi)\in\mathcal T\bigr)\,d\mu
\\
&=
\int_{\Omega}
e^{\epsilon_{\mathrm{CR}}}
P\bigl(A(\mathcal D',\phi)\in\mathcal T\bigr)
\,g\,d\mu'
\\
&\leq
\int_{\Omega}
e^{\epsilon_{\mathrm{DP}}+\epsilon_{\mathrm{CR}}}
P\bigl(A(\mathcal D',\phi)\in\mathcal T\bigr)\,d\mu'
\\
&=
e^{\epsilon_{\mathrm{DP}}+\epsilon_{\mathrm{CR}}}
P\Bigl(
A\bigl(\mathcal D',\Phi(\mathcal D')\bigr)
\in\mathcal T
\Bigr).
\end{aligned}
\]

上述结论以至少  
\[
1-\delta_{\mathrm{DP}}-\delta_{\mathrm{CR}}
\]
的概率成立。下界可以用类似的方法证明。 \(\square\)



https://arxiv.org/pdf/2503.09117
### GRU
unlearning/methods

> 想要解决带有范围约束的优化问题，可以使用 KKT 条件

KKT 条件

考虑

$$
\min_x f(x),
\qquad
\text{s.t. }
g_i(x)\le0,\quad i=1,\ldots,m,
$$

$$
h_j(x)=0,\quad j=1,\ldots,p.
$$

定义拉格朗日函数

$$
\mathcal L(x,\lambda,\nu)
=
f(x)
+
\sum_{i=1}^m\lambda_i g_i(x)
+
\sum_{j=1}^p\nu_j h_j(x).
$$

其中对于 \(g_i(x)\le0\)，必须有 \(\lambda_i\ge0\)。在适当约束资格条件下，局部最优解应满足以下四类条件。

**原始可行性**

最优点必须满足原问题约束：

$$
g_i(x^\star)\le0,\qquad h_j(x^\star)=0.
$$

**对偶可行性**

不等式乘子必须非负：

$$
\lambda_i^\star\ge0.
$$

**驻点条件**

对优化变量 \(x\) 的梯度为零：

$$
\nabla_x\mathcal L(x^\star,\lambda^\star,\nu^\star)=0.
$$

即

$$
\nabla f(x^\star)
+
\sum_i\lambda_i^\star\nabla g_i(x^\star)
+
\sum_j\nu_j^\star\nabla h_j(x^\star)
=0.
$$

**互补松弛条件**
$$
\lambda_i^\star g_i(x^\star)=0.
$$

这是不等式约束中最关键、也最容易被省略的一条。

它表达了：

- 约束若不活跃，即 \(g_i(x^\star)<0\)，则对应乘子必须是 \(0\)；
- 乘子若大于 \(0\)，则该约束必须刚好卡在边界上，即 \(g_i(x^\star)=0\)。

一般非凸问题中，KKT 通常只是局部最优的**必要条件**，找到满足 KKT 的点后，还要判断二阶条件、比较目标值或利用问题结构。

---

![image-20260713160824778](C:\Users\15951\AppData\Roaming\Typora\typora-user-images\image-20260713160824778.png)

> 在和原遗忘梯度更新相差最小的条件下，让其不损失保留性能。

记

\[
x=\tilde g_u^{(t)},\qquad
u=g_u^{(t)},\qquad
r=g_r^{(t)}.
\]

问题变为

\[
\min_x \|x-u\|^2,
\qquad
\text{s.t. }\langle x,r\rangle\ge0.
\]

为方便使用标准形式，把约束改写为

\[
-\langle x,r\rangle\le0.
\]

目标函数是否乘 \(\frac12\) 不影响最优解，取

\[
f(x)=\frac12\|x-u\|^2.
\]

于是拉格朗日函数为

\[
\mathcal L(x,\kappa)
=
\frac12\|x-u\|^2
-\kappa\langle x,r\rangle,
\qquad \kappa\ge0.
\]

**驻点条件**

对 \(x\) 求梯度：

\[
\nabla_x\mathcal L(x,\kappa)
=
x-u-\kappa r.
\]

令其等于零：

\[
x-u-\kappa r=0.
\]

因此

\[
x=u+\kappa r.
\]

**原始可行性**
\[
\langle x,r\rangle\ge0.
\]

把 \(x=u+\kappa r\) 代入：

\[
\langle u+\kappa r,r\rangle\ge0,
\]

即

\[
\langle u,r\rangle+\kappa\|r\|^2\ge0.
\]

若 \(r\neq0\)，可写为

\[
\kappa
\ge
-\frac{\langle u,r\rangle}{\|r\|^2}.
\]

**对偶可行性**
\[
\kappa\ge0.
\]

因此

\[
\kappa
\ge
\max\left\{
0,
-\frac{\langle u,r\rangle}{\|r\|^2}
\right\}.
\]

**互补松弛**

标准 KKT 还要求

\[
\kappa\bigl(-\langle x,r\rangle\bigr)=0.
\]

等价地，

\[
\kappa\langle x,r\rangle=0.
\]

这使得问题分为两类。

**情况一：原始梯度已经可行**

若

\[
\langle u,r\rangle\ge0,
\]

则

\[
\kappa=0.
\]

所以

\[
x^\star=u.
\]

**情况二：原始梯度违反约束**

若

\[
\langle u,r\rangle<0,
\]

则 \(x=u\) 不可行。此时 \(\kappa\) 不可能为零，所以由互补松弛可知约束必须活跃：

\[
\langle x,r\rangle=0.
\]

代入 \(x=u+\kappa r\)：

\[
\langle u,r\rangle+\kappa\|r\|^2=0.
\]

所以

\[
\kappa
=
-\frac{\langle u,r\rangle}{\|r\|^2}.
\]

由于此时 \(\langle u,r\rangle<0\)，该乘子确实满足 \(\kappa>0\)。

合并两种情形：

\[
\kappa^\star
=
\max\left\{
0,
-\frac{\langle u,r\rangle}{\|r\|^2}
\right\}
=
\frac{[-\langle u,r\rangle]_+}{\|r\|^2}.
\]

即得结果。

---

![image-20260713161844210](C:\Users\15951\AppData\Roaming\Typora\typora-user-images\image-20260713161844210.png)

> 想证明 GRU 方法在保留能力的同时，不会遗忘得更差

由 L 光滑性，
$$
\mathcal L(\theta^{(t)}-\tilde{g}^{(t)}_u)\le\mathcal L(\theta^{(t)})-\eta\langle g_u^{(t)},\tilde{g}^{(t)}_u\rangle+\frac{L\eta^2}{2}||\tilde{g}^{(t)}_u||^2
$$


根据 $\tilde{g}^{(t)}_u$ 的表达式，可以证明

\[
\langle g_u^{(t)},\tilde{g}^{(t)}_u\rangle=||\tilde{g}^{(t)}_u||^2
\]

因此损失变化的符号由

\[
-\eta+\frac{L\eta^2}{2}
\]

决定，解二次方程即得结论。

一个特例是 $\tilde{g}^{(t)}_u=0$ 的情况，此时更新量为零，也就是两个梯度方向相反的情况。

---

![image-20260713163108458](C:\Users\15951\AppData\Roaming\Typora\typora-user-images\image-20260713163108458.png)

> 与正常更新相比，使用 GRU 能在保留集上损失更低。

简化记号，令

\[
\theta=\theta^{(t)},\qquad
g=g_u^{(t)},\qquad
\tilde g=\tilde g_u^{(t)},\qquad
g_r=\nabla\mathcal R(\theta),\qquad
\eta=\mathrm{lr}.
\]

原始更新为

\[
\theta_u^{(t+1)}=\theta-\eta g,
\]

GRU 修正后的更新为

\[
\theta_{\mathrm{gru}}^{(t+1)}
=
\theta-\eta\tilde g.
\]

想要证明

\[
\Delta
=
\mathcal R(\theta_u^{(t+1)})
-
\mathcal R(\theta_{\mathrm{gru}}^{(t+1)}).
\]

\[
\Delta\ge0
\]

定义

\[
\mathfrak H_q(\mathcal R;g)
=
\int_0^1
(1-a)
g^\top
\nabla^2\mathcal R(\theta-aqg)
g\,da.
\]

它描述从 \(\theta\) 沿 \(-g\) 方向移动长度 \(q\) 时，整条更新路径上的加权方向曲率。

令

\[
\phi(s)=\mathcal R(\theta-sg),
\]

则

\[
\phi''(s)
=
g^\top\nabla^2\mathcal R(\theta-sg)g.
\]

所以 \(\mathfrak H_q\) 就是路径上这些二阶导数的加权积分。假设的条件
\[
\mathfrak H_\eta(\mathcal R;g)
\ge
\ell\|g\|^2.
\]

在直观上表示参考损失沿原始更新方向具有足够大的正曲率，\(\ell\) 是方向曲率的一个下界。

对 $\mathcal R(\theta-\eta g)$ 进行二阶 Taylor 展开

\[
\begin{aligned}
\mathcal R(\theta-\eta g)
={}&
\mathcal R(\theta)
-\eta \nabla\mathcal R(\theta)^\top g\\
&+
\eta^2
\int_0^1(1-a)
g^\top\nabla^2\mathcal R(\theta-a\eta g)g\,da.
\end{aligned}
\]

\[
\mathcal R(\theta-\eta g)
=
\mathcal R(\theta)
-\eta\langle g_r,g\rangle
+
\eta^2\mathfrak H_\eta(\mathcal R;g).
\]

由曲率假设可得

\[
\boxed{
\mathcal R(\theta_u^{(t+1)})
\ge
\mathcal R(\theta)
-\eta\langle g_r,g\rangle
+
\ell\eta^2\|g\|^2
}.
\]

这给出了原始更新后参考损失的下界。

接下来对修正更新后的损失建立上界。由假设 \(\mathcal R\) 是 \(L\)-smooth，即
\[
\|\nabla\mathcal R(x)-\nabla\mathcal R(y)\|
\le L\|x-y\|.
\]

由 descent lemma，

\[
\boxed{
\mathcal R(\theta_{\mathrm{gru}}^{(t+1)})
\le
\mathcal R(\theta)
-\eta\langle g_r,\tilde g\rangle
+
\frac{L\eta^2}{2}\|\tilde g\|^2
}.
\]

这是修正更新后参考损失的上界。

定义

\[
\Delta
=
\mathcal R(\theta_u^{(t+1)})
-
\mathcal R(\theta_{\mathrm{gru}}^{(t+1)}).
\]

代入上下界，消去 \(\mathcal R(\theta)\)，得到
\[
\begin{aligned}
\Delta
\ge{}&
\eta
\left(
\langle g_r,\tilde g\rangle
-
\langle g_r,g\rangle
\right)\\
&+
\eta^2
\left(
\ell\|g\|^2
-\frac L2\|\tilde g\|^2
\right).
\end{aligned}
\]

因此，只要右边的两个部分都非负，就能推出 \(\Delta\ge0\)。

考虑第一项。由 $\tilde g$ 的定义，不冲突时为零，非负。冲突时

\[
\tilde g
=
g-
\frac{\langle g,g_r\rangle}{\|g_r\|^2}g_r.
\]

此时

\[
\langle g_r,\tilde g\rangle=0.
\]

所以

\[
\langle g_r,\tilde g\rangle
-
\langle g_r,g\rangle
=
-\langle g_r,g\rangle>0.
\]

这说明：修正会移除对参考损失不利的一阶分量，因此不会让参考损失的一阶变化变差。

第二部分是

\[
\eta^2
\left(
\ell\|g\|^2
-\frac L2\|\tilde g\|^2
\right).
\]

设 \(g\) 与 \(g_r\) 之间的夹角为 \(\phi\)，即

\[
\cos\phi
=
\frac{\langle g,g_r\rangle}
{\|g\|\|g_r\|}.
\]

在发生冲突并进行正交投影时，

\[
\tilde g
=
g-
\operatorname{proj}_{g_r}g.
\]

由正交分解，

\[
\|g\|^2
=
\|\operatorname{proj}_{g_r}g\|^2
+
\|\tilde g\|^2.
\]

而

\[
\|\operatorname{proj}_{g_r}g\|^2
=
\|g\|^2\cos^2\phi,
\]

所以

\[
\|\tilde g\|^2
=
\|g\|^2(1-\cos^2\phi)
=
\|g\|^2\sin^2\phi.
\]

代入二阶差异项：

\[
\begin{aligned}
\ell\|g\|^2-\frac L2\|\tilde g\|^2
&=
\ell\|g\|^2
-\frac L2\|g\|^2\sin^2\phi\\
&=
\|g\|^2
\left(
\ell-\frac L2\sin^2\phi
\right).
\end{aligned}
\]

因此，当

\[
\ell\ge\frac L2\sin^2\phi
\]

时，该部分非负。这就得出了结论。

# optimization

## optimizer

2604.09258

### nexus

为刻画非凸景观，假设参数空间 \(\mathbb{R}^d\) 被划分为一组互不相交的吸引盆 \(\{\mathcal{B}\}\)。在任意给定的吸引盆 \(\mathcal{B}\) 内，假设从分布 \(\mathcal{P}\) 中采样的任意任务 \(\mathcal{L}\) 局部上都是一个二次函数：
\[
\mathcal{L}(\theta)
=
\frac{a}{2}\left\|\theta-\theta_{\mathcal{B}}^*\right\|_2^2+c_{\mathcal{B}},
\]

其中，局部任务极小值满足

\[
\theta_{\mathcal{B}}^*\sim \mathcal{P}\left(\mu_{\mathcal{B}},\sigma_{\mathcal{B}}^2\mathbf{I}\right),
\]

其均值为 \(\mu_{\mathcal{B}}\)，方差为 \(\sigma_{\mathcal{B}}^2\)；而 \(c_{\mathcal{B}}\) 表示吸引盆 \(\mathcal{B}\) 的内在损失（深度）。

设预训练任务 \(\{\mathcal{L}_k\}_{k=1}^{K}\) 和下游任务 \(\mathcal{L}_{\mathcal{T}}\) 均为从 \(\mathcal{P}\) 中独立同分布采样的任务。定义

\[
\Theta
=
\left\{
\theta_{\mathrm{train},\mathcal{B}}^*
\;\middle|\;
\mathcal{L}_{\mathrm{train}}
\left(\theta_{\mathrm{train},\mathcal{B}}^*\right)
=
C_{\mathrm{train}}
\right\}
\]

为不同吸引盆中能够达到完全相同训练损失 \(C_{\mathrm{train}}\) 的收敛极小值集合。则对于任意候选解 \(\theta_{\mathrm{train},\mathcal{B}}^*\in\Theta\)，在一个未见过的任务 \(\mathcal{T}\sim\mathcal{P}\) 上，其期望下游误差与任务方差 \(\sigma_{\mathcal{B}}^2\) 严格成正比：

\[
\mathbb{E}_{\mathcal{T}\sim\mathcal{P}}
\left[
\mathcal{L}_{\mathcal{T}}
\left(\theta_{\mathrm{train},\mathcal{B}}^*\right)
\right]
=
C_{\mathrm{train}}
+
\frac{a}{K}\sigma_{\mathcal{B}}^2.
\tag{5}
\]

> 二次情形下的 closeness 结果。期望下游误差与 $\sigma_{\mathcal{B}}^2$ 成正比，说明任务极小点越接近，泛化越好。

由 $\theta_{\mathrm{train}}^*$ 是极小点：
\[
\nabla_{\theta}\mathcal{L}_{\mathrm{train}}(\theta)
=\frac{1}{K}\sum_{k=1}^{K}a(\theta-\theta_k^*)
=a\left(\theta-\frac{1}{K}\sum_{k=1}^{K}\theta_k^*\right).
\]
解得
\[
\theta_{\mathrm{train}}^* = \frac{1}{K}\sum_{k=1}^{K}\theta_k^*.
\]

此最优点处的训练损失为：
\[
\mathcal{L}_{\mathrm{train}}\left(\theta_{\mathrm{train}}^*\right)
=\frac{1}{K}\sum_{k=1}^{K}\left(\frac{a}{2}\left\|\theta_{\mathrm{train}}^*-\theta_k^*\right\|_2^2+c\right)
=C_{\mathrm{train}}.
\]

由此，可以根据固定的训练损失 \(C_{\mathrm{train}}\)，表示内在损失常数 \(c\)（它代表极小值的“深度”）：
\[
c=C_{\mathrm{train}}-\frac{a}{2K}\sum_{k=1}^{K}\left\|\theta_{\mathrm{train}}^*-\theta_k^*\right\|_2^2.
\]

现在，考虑一个新的下游任务 \(\mathcal{T}\)，其极小值为 \(\theta_{\mathcal{T}}^*\sim\mathcal{P}\)：
\[
\mathcal{L}_{\mathcal{T}}\left(\theta_{\mathrm{train}}^*\right)
=\frac{a}{2}\left\|\theta_{\mathrm{train}}^*-\theta_{\mathcal{T}}^*\right\|_2^2+c.
\]

代入 \(c\) 后，泛化差距变为：
\[
\mathcal{L}_{\mathcal{T}}\left(\theta_{\mathrm{train}}^*\right)-C_{\mathrm{train}}
=\frac{a}{2}\left(\left\|\theta_{\mathrm{train}}^*-\theta_{\mathcal{T}}^*\right\|_2^2-\frac{1}{K}\sum_{k=1}^{K}\left\|\theta_{\mathrm{train}}^*-\theta_k^*\right\|_2^2\right).
\tag{1}
\]

先计算 (1) 等号右边的第一项。

由于各个 \(\theta_k^*\) 相互独立，预训练参数的协方差为
\[
\operatorname{Cov}(\theta_{\mathrm{train}}^*)
=\operatorname{Cov}\left(\frac{1}{K}\sum_{k=1}^K\theta_k^*\right)
=\frac{1}{K^2}\sum_{k=1}^K\operatorname{Cov}(\theta_k^*)
=\frac{\sigma^2}{K}I.
\]

因为 \(\theta_{\mathrm{train}}^*\) 和 \(\theta_{\mathcal T}^*\) 独立
\[
\operatorname{Cov}(\theta_{\mathrm{train}}^*-\theta_{\mathcal T}^*)
=\frac{\sigma^2}{K}I+\sigma^2 I
=\left(1+\frac{1}{K}\right)\sigma^2 I.
\]

预训练参数的均值为
$$
\mathbb E[\theta_{\mathrm{train}}^*]
=\frac{1}{K}\sum_{k=1}^K\mathbb E[\theta_k^*]
=\mu.
$$

所以
\[
\mathbb E\left[\theta_{\mathrm{train}}^*-\theta_{\mathcal T}^*\right]=\mu-\mu=0
\]
对于均值为零的随机向量 \(Z\)，有
\[
\mathbb E\left[\|Z\|_2^2\right]
=\operatorname{tr}\left(\operatorname{Cov}(Z)\right).
\]
因此
\[
\mathbb E\left[
\left\|\theta_{\mathrm{train}}^*-\theta_{\mathcal T}^*\right\|_2^2
\right]
=\left(1+\frac{1}{K}\right)\sigma^2,
\]
再计算 (1) 等号右边的第二项。

由
\[
\theta_k^*-\bar\theta^*
=(\theta_k^*-\mu)-(\bar\theta^*-\mu)
\]
平方再求和
\[
\begin{aligned}
\sum_{k=1}^K\left\|\theta_k^*-\theta_{\mathrm{train}}^*\right\|_2^2
&=
\sum_{k=1}^K\left\|\theta_k^*-\mu\right\|_2^2
+K\left\|\theta_{\mathrm{train}}^*-\mu\right\|_2^2
-2\sum_{k=1}^K(\theta_k^*-\mu)^\mathsf T(\theta_{\mathrm{train}}^*-\mu)\\
&=\sum_{k=1}^K\left\|\theta_k^*-\mu\right\|_2^2
-K\left\|\theta_{\mathrm{train}}^*-\mu\right\|_2^2
\end{aligned}
\]

两边除以 \(K\)，再取期望：
\[
\begin{aligned}
&\mathbb E\left[\frac{1}{K}\sum_{k=1}^K
\left\|\theta_k^*-\bar\theta^*\right\|_2^2\right] \\
&=\mathbb E\left[\frac{1}{K}\sum_{k=1}^K
\left\|\theta_k^*-\mu\right\|_2^2\right]
-\mathbb E\left[\left\|\theta_{\mathrm{train}}^*-\mu\right\|_2^2\right].
\end{aligned}
\]

样本均值的协方差缩小为原来的 \(1/K\)，所以
\[
E\left[\left\|\theta_{\mathrm{train}}^*-\mu\right\|_2^2\right]
=\frac{1}{K}\sigma^2.
\]
因此
\[
\begin{aligned}
\mathbb E\left[\frac{1}{K}\sum_{k=1}^{K}
\left\|\theta_{\mathrm{train}}^*-\theta_k^*\right\|_2^2\right]
&=\sigma^2-\frac{1}{K}\sigma^2\\
&=\frac{K-1}{K}\sigma^2.
\end{aligned}
\]

都代入 (1) 即得
\[
\mathbb{E}\left[\mathcal{L}_{\mathcal{T}}\left(\theta_{\mathrm{train}}^*\right)\right]-C_{\mathrm{train}}
=\frac{a}{2}\left(\left(1+\frac{1}{K}\right)\sigma^2-\frac{K-1}{K}\sigma^2\right)
=\frac{a}{K}\sigma^2.
\]
这就证明了结论。

---

设 \(\theta^*\) 是总体损失
\[
\mathbb{E}_{\mathcal{L}\sim\mathcal{P}}[\mathcal{L}(\theta)]
\]
的一个特定局部极小点。对于从 \(\mathcal{P}\) 中采样的任意任务 \(\mathcal{L}\)，令
\[
\theta_{\mathcal{L}}^*=\arg\min_{\theta\in\mathcal{S}_{\mathcal{L}}}\|\theta^*-\theta\|_2
\]
表示与其对应的局部极小点，这里
\[
\mathcal{S}_{\mathcal{L}} = \left\{\vartheta \mid \exists\,\epsilon > 0,\ \forall\vartheta' \in B_\epsilon(\vartheta),\ \mathcal{L}_\mathcal L(\vartheta) \leq \mathcal{L}_\mathcal L(\vartheta')\right\}.
\]
是 $\mathcal L$ 的极小点集合。

假设对于任意任务 \(\mathcal{L}\sim\mathcal{P}\)，损失函数沿线段 \([\theta_{\mathcal{L}}^*,\theta^*]\) 在局部具有方向强凸性，即对于任意
\[
\xi\in[\theta_{\mathcal{L}}^*,\theta^*]
\]
以及任意单位向量
\[
u\in\operatorname{span}\{\theta^*-\theta_{\mathcal{L}}^*\mid\mathcal{L}\sim\mathcal{P}\},
\]
均有
\[
\lambda_{\max}\ge u^\top\nabla^2\mathcal{L}(\xi)u\ge\lambda_{\min}>0.
\]

令
\[
\mu=\mathbb{E}[\theta_{\mathcal{L}}^*],
\qquad
\sigma^2=\mathbb{E}\left[\|\theta_{\mathcal{L}}^*-\mu\|_2^2\right].
\]
假设在分布 \(\mathcal{P}\) 上，任务的平坦度 \(\nabla^2\mathcal{L}_{\mathcal{L}}(\xi)\) 与任务的接近程度 \(\theta_{\mathcal{L}}^*\) 在统计上相互独立。在训练损失固定为 \(C_{\mathrm{train}}\) 的条件下，收敛后的训练参数 \(\theta_{\mathrm{train}}^*\) 的期望分布外泛化误差满足以下上界：
\[
\mathbb{E}_{\mathcal{T}\sim\mathcal{P}}\left[\mathcal{L}_{\mathcal{T}}\left(\theta_{\mathrm{train}}^*\right)\right]-C_{\mathrm{train}}
\le
\frac{\lambda_{\max}\left(\left(\frac{\lambda_{\max}}{\lambda_{\min}}\right)^2+1\right)}{2K}\sigma^2.
\]

> 非二次情形的 closeness 结果推广。只要在特定方向 $[\theta_{\mathcal{L}}^*,\theta^*]$ 上具有强凸性，就能得到类似的下游误差正比于方差的结果。

我们现在将前面的结果推广到一般情形。假设预训练任务集合 \(\{\mathcal{L}_k\}_{k=1}^K\) 和下游任务 \(\mathcal{L}_T\) 都独立地从潜在任务分布 \(\mathcal{P}\) 中采样。

由于大语言模型具有过参数化的特性，极小值点并不唯一。类似 $\mathcal{S}_{\mathcal{L}}$，首先定义期望总体损失的局部极小值集合：

$$
\mathcal{S}_{\mathcal{P}} = \left\{\vartheta \mid \exists\,\epsilon > 0,\ \forall\vartheta' \in B_\epsilon(\vartheta),\ \mathbb{E}_{\mathcal{L}_T\sim\mathcal{P}}\left[\mathcal{L}_T(\vartheta)\right] \leq \mathbb{E}_{\mathcal{L}_T\sim\mathcal{P}}\left[\mathcal{L}_T(\vartheta')\right]\right\}.
$$

令 \(\theta^* \in \mathcal{S}_{\mathcal{P}}\) 为总体损失的一个特定局部极小值点。它将作为吸引域的基准点。

接下来，我们将任务特定的极小值点 \(\theta_k^*\) 定义为总体极小值点 \(\theta^*\) 在任务 \(k\) 的局部极小值集合上的投影：

$$
\theta_k^* = \underset{\vartheta\in\mathcal{S}_k}{\arg\min}\ \|\vartheta-\theta^*\|_2,
$$

其中 $\mathcal{S}_{k} = \left\{\vartheta \mid \exists\,\epsilon > 0,\ \forall\vartheta' \in B_\epsilon(\vartheta),\ \mathcal{L}_k(\vartheta) \leq \mathcal{L}_k(\vartheta')\right\}$ 是 $k$ 的极小值集合。

给定这些任务特定极小值点 \(\{\theta_k^*\}\) 的分布，我们将它们的统计中心 \(\mu\) 和内在协方差 \(\boldsymbol{\Sigma}\) 定义为：
$$
\mu := \mathbb{E}_{\mathcal{T}\sim\mathcal{P}}[\theta_\mathcal{T}^*],
\qquad
\boldsymbol{\Sigma} := \mathbb{E}\left[(\theta_\mathcal{T}^*-\mu)(\theta_\mathcal{T}^*-\mu)^\top\right].
$$

我们还定义标量内在方差
\[
\sigma^2 = \operatorname{Tr}(\boldsymbol{\Sigma}) = \mathbb{E}[\|\theta_k^* - \mu\|_2^2]
\]
从这里开始，我们的分析将聚焦于与统计中心 \(\mu\) 的接近程度，因为根据定义，有
$$
\mathbb{E}[\theta_\mathcal{T}^* - \mu] = 0
$$
**步骤 1：估计误差。** 

由 $\nabla \mathcal{L}_{\mathrm{train}}\left(\theta^*_{\mathrm{train}}\right)=0$ 知
$$
\sum_{k=1}^{K}\nabla \mathcal{L}_k\left(\theta^*_{\mathrm{train}}\right)=0
$$

根据中值定理，存在 \(\xi_k\in[\theta^*_{\mathrm{train}},\theta_k^*]\)，使得

$$
\nabla \mathcal{L}_k\left(\theta^*_{\mathrm{train}}\right)
=
\nabla^2\mathcal{L}_k(\xi_k)\left(\theta^*_{\mathrm{train}}-\theta_k^*\right)。
$$

因此：

$$
\sum_{k=1}^{K}\nabla^2\mathcal{L}_k(\xi_k)\left(\theta^*_{\mathrm{train}}-\mu\right)
=
\sum_{k=1}^{K}\nabla^2\mathcal{L}_k(\xi_k)\left(\theta_k^*-\mu\right)。
$$

我们假设局部曲率有界：对于任意 \(k\) 和向量 \(\boldsymbol{u}\)，都有

$$
\lambda_{\min}\|\boldsymbol{u}\|^2
\leq
\boldsymbol{u}^{\top}\nabla^2\mathcal{L}_k(\xi_k)\boldsymbol{u}
\leq
\lambda_{\max}\|\boldsymbol{u}\|^2。
$$

因此

$$
\left\|\theta^*_{\mathrm{train}}-\mu\right\|_2
\leq
\frac{1}{K\lambda_{\min}}
\sum_{k=1}^{K}\lambda_{\max}\left\|\theta_k^*-\mu\right\|_2。
$$

平方并取期望（注意到由于 \(\mathbb{E}[\theta_k^*-\mu]=0\)，交叉项会消失），并定义

$$
\kappa=\frac{\lambda_{\max}}{\lambda_{\min}}，
$$

可得

$$
\mathbb{E}\left[\left\|\theta^*_{\mathrm{train}}-\mu\right\|_2^2\right]
\leq
\frac{\kappa^2}{K}\sigma^2。
$$
**步骤 2：内在损失的权衡。** 我们考虑训练损失达到固定值 \(C_{\mathrm{train}}\) 的情形。围绕各任务极小值点进行精确的泰勒展开，可得训练损失为：

$$
C_{\mathrm{train}}
=
\frac{1}{K}\sum_{k=1}^{K}\mathcal{L}_k\left(\theta^*_{\mathrm{train}}\right)
=
\frac{1}{K}\sum_{k=1}^{K}\left(
\mathcal{L}_k\left(\theta_k^*\right)
+
\frac{1}{2}\left(\theta^*_{\mathrm{train}}-\theta_k^*\right)^{\top}
\nabla^2\mathcal{L}_k(\xi_k)
\left(\theta^*_{\mathrm{train}}-\theta_k^*\right)
\right)。
$$

对任务分布取期望，可以将期望内在损失精确表示为：

$$
\mathbb{E}\left[\mathcal{L}_k\left(\theta_k^*\right)\right]
=
C_{\mathrm{train}}
-
\underbrace{\frac{1}{2}\mathbb{E}\left[
\frac{1}{K}\sum_{k=1}^{K}
\left(\theta^*_{\mathrm{train}}-\theta_k^*\right)^{\top}
\nabla^2\mathcal{L}_k(\xi_k)
\left(\theta^*_{\mathrm{train}}-\theta_k^*\right)
\right]}_{Q_{\mathrm{train}}}
$$

\(Q_{\mathrm{train}}\) 衡量的是收敛点 $\theta^*_{\mathrm{train}}$ 与各任务极小值点之间被 Hessian 的曲率加权的平均距离。

**步骤 3：下游泛化（严格的矩阵推导）。** 

最后，我们分析从相同分布 \(\mathcal{P}\) 中采样得到的下游任务 \(\mathcal{T}\) 上的期望性能。我们围绕任务特定的极小值点 \(\theta^*_{\mathcal{T}}\) 对测试损失进行泰勒展开。由于 \(\nabla\mathcal{L}_{\mathcal{T}}(\theta^*_{\mathcal{T}})=0\)，一阶项消失：
$$
\mathcal{L}_{\mathcal{T}}\left(\theta^*_{\mathrm{train}}\right)
=
\mathcal{L}_{\mathcal{T}}\left(\theta^*_{\mathcal{T}}\right)
+
\frac{1}{2}\left(\theta^*_{\mathrm{train}}-\theta^*_{\mathcal{T}}\right)^{\top}
\nabla^2\mathcal{L}_{\mathcal{T}}(\xi_{\mathcal{T}})
\left(\theta^*_{\mathrm{train}}-\theta^*_{\mathcal{T}}\right)。
$$

对任务分布取期望

$$
\mathbb{E}_{\mathcal{T}}\left[\mathcal{L}_{\mathcal{T}}\left(\theta^*_{\mathrm{train}}\right)\right]
=
\mathbb{E}\left[\mathcal{L}_{\mathcal{T}}\left(\theta^*_{\mathcal{T}}\right)\right]
+
\underbrace{
\frac{1}{2}\mathbb{E}\left[
\left(\theta^*_{\mathrm{train}}-\theta^*_{\mathcal{T}}\right)^{\top}
\nabla^2\mathcal{L}_{\mathcal{T}}(\xi_{\mathcal{T}})
\left(\theta^*_{\mathrm{train}}-\theta^*_{\mathcal{T}}\right)
\right]}_{Q_{\mathrm{test}}}
$$

回顾式中给出的内在损失权衡关系，我们有

$$
\mathbb{E}\left[\mathcal{L}_{\mathcal{T}}\left(\theta^*_{\mathcal{T}}\right)\right]
=
C_{\mathrm{train}}-Q_{\mathrm{train}}。
$$

将其代入上式，可得泛化间隔的分解：

$$
\mathbb{E}_{\mathcal{T}}\left[\mathcal{L}_{\mathcal{T}}\left(\theta^*_{\mathrm{train}}\right)\right]
=
C_{\mathrm{train}}+\left(Q_{\mathrm{test}}-Q_{\mathrm{train}}\right)。
$$
令

$$
\bar{\mathbf{H}}=\mathbb{E}_{\mathcal{P}}[\nabla^2\mathcal{L}(\xi)]
$$

表示在任务分布上的期望 Hessian 矩阵。由于各任务独立同分布，训练任务和测试任务共享这一期望几何结构。

对于测试项 $Q_{\mathrm{test}}$，我们使用恒等式

$$
\mathbf{x}^{\top}\mathbf{A}\mathbf{x}=\operatorname{Tr}(\mathbf{A}\mathbf{x}\mathbf{x}^{\top}).
$$

将具体任务的 Hessian 替换为期望 Hessian

$$
\bar{\mathbf{H}}=\mathbb{E}_{\mathcal{P}}[\nabla^2\mathcal{L}(\xi)]:
$$

$$
Q_{\mathrm{test}}
=\frac{1}{2}\operatorname{Tr}\left(\bar{\mathbf{H}}\cdot\mathbb{E}\left[(\theta^*_{\mathrm{train}}-\theta^*_{\mathcal{T}})(\theta^*_{\mathrm{train}}-\theta^*_{\mathcal{T}})^{\top}\right]\right).
$$

我们围绕统计中心 $\mu$ 对协方差项进行完整展开：

$$
\begin{aligned}
&\mathbb{E}\left[(\theta^*_{\mathrm{train}}-\theta^*_{\mathcal{T}})(\theta^*_{\mathrm{train}}-\theta^*_{\mathcal{T}})^{\top}\right] \\
&=\mathbb{E}\left[((\theta^*_{\mathrm{train}}-\mu)-(\theta^*_{\mathcal{T}}-\mu))((\theta^*_{\mathrm{train}}-\mu)-(\theta^*_{\mathcal{T}}-\mu))^{\top}\right] \\
&=\mathbb{E}\left[(\theta^*_{\mathrm{train}}-\mu)(\theta^*_{\mathrm{train}}-\mu)^{\top}\right]
+\mathbb{E}\left[(\theta^*_{\mathcal{T}}-\mu)(\theta^*_{\mathcal{T}}-\mu)^{\top}\right] \\
&\quad-\mathbb{E}\left[(\theta^*_{\mathrm{train}}-\mu)(\theta^*_{\mathcal{T}}-\mu)^{\top}\right]
-\mathbb{E}\left[(\theta^*_{\mathcal{T}}-\mu)(\theta^*_{\mathrm{train}}-\mu)^{\top}\right].
\end{aligned}
$$

交叉项严格为零，这是因为 $\theta^*_{\mathcal{T}}$ 与 $\theta^*_{\mathrm{train}}$ 相互独立，并且以 $\mu$ 为中心（即根据 $\mu$ 的定义，$\mathbb{E}[\theta^*_{\mathcal{T}}-\mu]=0$）。将

$$
\mathbb{E}\left[(\theta^*_{\mathcal{T}}-\mu)(\theta^*_{\mathcal{T}}-\mu)^{\top}\right]=\boldsymbol{\Sigma}
$$

代回，可得：

$$
Q_{\mathrm{test}}
=\frac{1}{2}\operatorname{Tr}\left(\bar{\mathbf{H}}\cdot\mathbb{E}\left[(\theta^*_{\mathrm{train}}-\mu)(\theta^*_{\mathrm{train}}-\mu)^{\top}\right]\right)
+\frac{1}{2}\operatorname{Tr}(\bar{\mathbf{H}}\boldsymbol{\Sigma}).
$$

对于训练项 $Q_{\mathrm{train}}$，我们考虑在训练任务上取平均后的期望二次惩罚项。根据期望的线性性，可以将 $\nabla^2\mathcal{L}_k$ 精确替换为 $\bar{\mathbf{H}}$：

$$
Q_{\mathrm{train}}
=\frac{1}{2K}\sum_{k=1}^{K}\mathbb{E}\left[(\theta^*_{\mathrm{train}}-\theta_k^*)^{\top}\bar{\mathbf{H}}(\theta^*_{\mathrm{train}}-\theta_k^*)\right].
$$
对于任意半正定矩阵 \(\bar{\mathbf{H}}\)，平方误差的加权和在均值 $\bar{\theta}=\frac{1}{K}\sum_{k=1}^{K}\theta_k^*$ 处取得最小值。因此，我们得到如下严格下界：
$$
\sum_{k=1}^{K}
(\theta^*_{\mathrm{train}}-\theta_k^*)^{\top}
\bar{\mathbf{H}}
(\theta^*_{\mathrm{train}}-\theta_k^*)
\geq
\sum_{k=1}^{K}
(\bar{\theta}-\theta_k^*)^{\top}
\bar{\mathbf{H}}
(\bar{\theta}-\theta_k^*).
$$

通过引入 \(\mu\)，我们对右侧进行矩阵形式的方差分解：

$$
\begin{aligned}
\sum_{k=1}^{K}
(\bar{\theta}-\theta_k^*)^{\top}
\bar{\mathbf{H}}
(\bar{\theta}-\theta_k^*)
&=
\sum_{k=1}^{K}
\left((\bar{\theta}-\mu)-(\theta_k^*-\mu)\right)^{\top}
\bar{\mathbf{H}}
\left((\bar{\theta}-\mu)-(\theta_k^*-\mu)\right) \\
&=
\sum_{k=1}^{K}
(\bar{\theta}-\mu)^{\top}
\bar{\mathbf{H}}
(\bar{\theta}-\mu)
+
\sum_{k=1}^{K}
(\theta_k^*-\mu)^{\top}
\bar{\mathbf{H}}
(\theta_k^*-\mu) \\
&\quad
-2(\bar{\theta}-\mu)^{\top}
\bar{\mathbf{H}}
\sum_{k=1}^{K}(\theta_k^*-\mu).
\end{aligned}
$$

其中，

$$
\sum_{k=1}^{K}(\theta_k^*-\mu)
=
K(\bar{\theta}-\mu).
$$

对交叉项进行化简，并与第一项合并：

$$
\begin{aligned}
\sum_{k=1}^{K}
(\bar{\theta}-\theta_k^*)^{\top}
\bar{\mathbf{H}}
(\bar{\theta}-\theta_k^*)
&=
K(\bar{\theta}-\mu)^{\top}
\bar{\mathbf{H}}
(\bar{\theta}-\mu)
+
\sum_{k=1}^{K}
(\theta_k^*-\mu)^{\top}
\bar{\mathbf{H}}
(\theta_k^*-\mu) \\
&\quad
-2K(\bar{\theta}-\mu)^{\top}
\bar{\mathbf{H}}
(\bar{\theta}-\mu) \\
&=
\sum_{k=1}^{K}
(\theta_k^*-\mu)^{\top}
\bar{\mathbf{H}}
(\theta_k^*-\mu)
-
K(\bar{\theta}-\mu)^{\top}
\bar{\mathbf{H}}
(\bar{\theta}-\mu).
\end{aligned}
$$
取期望，并使用迹恒等式

$$
\mathbb{E}[\boldsymbol{x}^{\top}\mathbf{A}\boldsymbol{x}]
=
\operatorname{Tr}\left(\mathbf{A}\mathbb{E}[\boldsymbol{x}\boldsymbol{x}^{\top}]\right).
$$

- 第一项为：

$$
\sum_{k=1}^{K}
\operatorname{Tr}\left(
\bar{\mathbf{H}}\,
\mathbb{E}\left[
(\theta_k^*-\mu)(\theta_k^*-\mu)^{\top}
\right]
\right)
=
K\operatorname{Tr}(\bar{\mathbf{H}}\boldsymbol{\Sigma}).
$$

- 第二项（样本均值的方差）为：

$$
\mathbb{E}\left[
(\bar{\theta}-\mu)(\bar{\theta}-\mu)^{\top}
\right]
=
\frac{1}{K}\boldsymbol{\Sigma}.
$$

因此，

$$
K\operatorname{Tr}\left(
\bar{\mathbf{H}}\cdot\frac{1}{K}\boldsymbol{\Sigma}
\right)
=
\operatorname{Tr}(\bar{\mathbf{H}}\boldsymbol{\Sigma}).
$$

将这两项结合起来，可以得到训练惩罚项的期望下界：

$$
Q_{\mathrm{train}}
\geq
\frac{1}{2K}
\left(
K\operatorname{Tr}(\bar{\mathbf{H}}\boldsymbol{\Sigma})
-
\operatorname{Tr}(\bar{\mathbf{H}}\boldsymbol{\Sigma})
\right)
=
\frac{1}{2}
\left(1-\frac{1}{K}\right)
\operatorname{Tr}(\bar{\mathbf{H}}\boldsymbol{\Sigma}).
$$

将两个项相减，即计算 \(Q_{\mathrm{test}}-Q_{\mathrm{train}}\) 时，主导项

$$
\frac{1}{2}\operatorname{Tr}(\bar{\mathbf{H}}\boldsymbol{\Sigma})
$$

恰好完全抵消. 随后，我们使用谱范数 \(\lambda_{\max}\) 以及前面得到的估计误差界来约束剩余项：

$$
\begin{aligned}
\mathbb{E}_{\mathcal{T}}
\left[
\mathcal{L}_{\mathcal{T}}(\theta^*_{\mathrm{train}})
\right]
-
C_{\mathrm{train}}
\leq{}&
\left(
\frac{1}{2}
\operatorname{Tr}\left(
\bar{\mathbf{H}}\,
\mathbb{E}\left[
(\theta^*_{\mathrm{train}}-\mu)
(\theta^*_{\mathrm{train}}-\mu)^{\top}
\right]
\right)
+
\frac{1}{2}\operatorname{Tr}(\bar{\mathbf{H}}\boldsymbol{\Sigma})
\right) \\
&-
\frac{1}{2}
\left(1-\frac{1}{K}\right)
\operatorname{Tr}(\bar{\mathbf{H}}\boldsymbol{\Sigma}) \\
={}&
\frac{1}{2}
\operatorname{Tr}\left(
\bar{\mathbf{H}}\,
\mathbb{E}\left[
(\theta^*_{\mathrm{train}}-\mu)
(\theta^*_{\mathrm{train}}-\mu)^{\top}
\right]
\right)
+
\frac{1}{2K}
\operatorname{Tr}(\bar{\mathbf{H}}\boldsymbol{\Sigma}) \\
\leq{}&
\frac{\lambda_{\max}}{2}
\mathbb{E}\left[
\|\theta^*_{\mathrm{train}}-\mu\|_2^2
\right]
+
\frac{\lambda_{\max}}{2K}
\operatorname{Tr}(\boldsymbol{\Sigma}) \\
\leq{}&
\frac{\lambda_{\max}}{2}
\left(
\frac{\kappa^2}{K}\sigma^2
\right)
+
\frac{\lambda_{\max}}{2K}\sigma^2 \\
={}&
\frac{\lambda_{\max}(\kappa^2+1)}{2K}\sigma^2.
\end{aligned}
$$

这表明，泛化差距的量级为

$$
O\left(\frac{\sigma^2}{K}\right),
$$

其主要由任务的内在方差以及预训练任务的数量决定.

---

假设每个 \(\mathcal{L}_i\) 都是 \(L\)-光滑的，并且是 \(\mu\)-强凸的。也就是说，对于任意 \(\theta_1,\theta_2\)，有：

\[
\mathcal{L}_i(\theta_1)
\leq
\mathcal{L}_i(\theta_2)
+\nabla \mathcal{L}_i(\theta_2)^\top(\theta_1-\theta_2)
+\frac{L}{2}\|\theta_1-\theta_2\|_2^2,
\]

\[
\mathcal{L}_i(\theta_1)
\geq
\mathcal{L}_i(\theta_2)
+\nabla \mathcal{L}_i(\theta_2)^\top(\theta_1-\theta_2)
+\frac{\mu}{2}\|\theta_1-\theta_2\|_2^2.
\]

此外，假设存在一个公共最小值点 \(\theta^*\)，使得对于所有 \(i\in[K]\)，都有

\[
\nabla \mathcal{L}_i(\theta^*)=0.
\]

那么，对于 Nexus 以步长 \(\gamma\in\left(0,\frac{2}{L+\mu}\right)\) 生成的序列 \(\{\theta_0,\theta_1,\ldots,\theta_T\}\)，有：

\[
\mathbb{E}\left[\|\theta_T-\theta^*\|_2^2\right]
\leq
\left(1-\frac{2\gamma\mu L}{L+\mu}\right)^T
\|\theta_0-\theta^*\|_2^2.
\]

特别地，如果令 $\gamma=\frac{2}{L+\mu}$，并定义条件数 $\kappa=\frac{L}{\mu}$，则可得到如下收敛速率：

\[
\mathbb{E}\left[\|\theta_T-\theta^*\|_2^2\right]
\leq
\left(\frac{\kappa-1}{\kappa+1}\right)^{2T}
\|\theta_0-\theta^*\|_2^2.
\]

因此，如果 Nexus 将参数引导至一个局部凸且光滑、并且存在公共最小值点的区域，那么它可以保证指数收敛。 

> nexus 优化器的收敛速率怎么样？

这段证明的核心思想是：**每一步随机选择一个任务做梯度下降时，到共同最优点的距离都会以统一比例收缩**。

设内循环的第 \(m\) 步随机采样任务 \(s_m\)，并执行

\[
\theta_m=\theta_{m-1}-\gamma \nabla \mathcal L_{s_m}(\theta_{m-1}).
\]

展开更新后参数与最优点之间的平方距离：

\[
\begin{aligned}
\|\theta_m-\theta^*\|^2
&=
\|\theta_{m-1}-\gamma\nabla\mathcal L_{s_m}(\theta_{m-1})-\theta^*\|^2\\
&=
\|\theta_{m-1}-\theta^*\|^2
-2\gamma
\left\langle
\nabla\mathcal L_{s_m}(\theta_{m-1}),
\theta_{m-1}-\theta^*
\right\rangle\\
&\quad
+\gamma^2\|\nabla\mathcal L_{s_m}(\theta_{m-1})\|^2.
\end{aligned}
\tag{1}
\]

因此，关键是给内积项

\[
\left\langle\nabla\mathcal L_i(\theta),\theta-\theta^*\right\rangle
\]

找一个足够强的下界。发现它与梯度的余强制性形式相似：

> 设函数 $f:\mathbb R^d\to\mathbb R$ 是凸函数，并且是 $M$-光滑的，那么它的梯度满足
> \[
> \left\langle
> \nabla f(x)-\nabla f(y),x-y
> \right\rangle
> \ge
> \frac1M
> \|\nabla f(x)-\nabla f(y)\|^2
> \]

左侧和我们要给出下界的 $-2\gamma
\left\langle
\nabla\mathcal L_{s_m}(\theta_{m-1}),
\theta_{m-1}-\theta^*
\right\rangle=-2\gamma
\left\langle
\nabla\mathcal L_{s_m}(\theta_{m-1})-\nabla\mathcal L_{s_m}(\theta^*),
\theta_{m-1}-\theta^*
\right\rangle$ 是一样的。直接代入：
$$
-2\gamma
\left\langle
\nabla\mathcal L_{s_m}(\theta_{m-1})-\nabla\mathcal L_{s_m}(\theta^*),
\theta_{m-1}-\theta^*
\right\rangle\le-\frac{2\gamma}{L}\|\nabla\mathcal L_{s_m}(\theta_{m-1})-\nabla\mathcal L_{s_m}(\theta^*)\|^2=-\frac{2\gamma}{L}\|\nabla\mathcal L_{s_m}(\theta_{m-1})\|^2
$$
再代入原式：
$$
\|\theta_m-\theta^*\|^2\le\|\theta_{m-1}-\theta^*\|^2+(\gamma-\frac{2\gamma}{L})\|\nabla\mathcal L_{s_m}(\theta_{m-1})\|^2
$$
这种时候，在 $\gamma\le\frac{2}{L}$ 的时候是可以收敛的，但是由于 $\|\theta_{m-1}-\theta^*\|^2$ 前面的系数是一，达不到指数的收敛速度。我们考虑应用余强制性的那个时候。余强制性要求凸并且 $M$-光滑，而我们的 $\mathcal L_{s_m}$ 是 $\mu$-强凸的，应用在仅仅要求凸的定理上就把强凸的条件浪费了。

考虑定义
\[
\phi_i(\theta)
=
\mathcal L_i(\theta)-\frac{\mu}{2}\|\theta\|^2.
\]

则 $\nabla\phi_i(x)=\nabla\mathcal L_i(x)-\mu x$，进而可以证明 $\phi_i$ 是凸函数：
$$
\begin{aligned}
&\phi_i(x)-\phi_i(y)-\langle\nabla\phi_i(y),x-y\rangle\\
={}&
\mathcal L_i(x)-\mathcal L_i(y)
-\frac{\mu}{2}\bigl(\|x\|^2-\|y\|^2\bigr)
-\left\langle\nabla\mathcal L_i(y)-\mu y,x-y\right\rangle\\
={}&
\mathcal L_i(x)-\mathcal L_i(y)
-\langle\nabla\mathcal L_i(y),x-y\rangle
-\frac{\mu}{2}
\left(
\|x\|^2-\|y\|^2-2\langle y,x-y\rangle
\right)\\
={}&
\mathcal L_i(x)-\mathcal L_i(y)
-\langle\nabla\mathcal L_i(y),x-y\rangle
-\frac{\mu}{2}\|x-y\|^2\ge0
\end{aligned}
$$
（事实上，如果 $\mathcal L$ 是二阶可微的，使用 $\nabla^2\phi(\theta)=\nabla^2\mathcal L(\theta)-\mu I$ 就可以直接证明）

同时，因为 \(\mathcal L_i\) 是 \(L\)-光滑的，\(\phi_i\) 是 \((L-\mu)\)-光滑的。

考虑对这个函数应用余强制性不等式。因为

\[
\nabla\phi_i(\theta)
=
\nabla\mathcal L_i(\theta)-\mu\theta
\]

以及共同最优点满足

\[
\nabla\mathcal L_i(\theta^*)=0,
\]

所以

\[
\nabla\phi_i(\theta)-\nabla\phi_i(\theta^*)
=
\nabla\mathcal L_i(\theta)-\mu(\theta-\theta^*).
\]

代入前面所说的余强制性不等式，得到

\[
\begin{aligned}
&\left\langle
\nabla\mathcal L_i(\theta)-\mu(\theta-\theta^*),
\theta-\theta^*
\right\rangle\\
&\qquad\ge
\frac{1}{L-\mu}
\left\|
\nabla\mathcal L_i(\theta)-\mu(\theta-\theta^*)
\right\|^2\\
&\qquad=\frac{1}{L-\mu}(\|\nabla\mathcal L_i(\theta)\|^2
-2\mu\left\langle
\nabla\mathcal L_i(\theta),\theta-\theta^*
\right\rangle
+\mu^2\|\theta-\theta^*\|^2)
\end{aligned}
\]

整理可得

\[
\left\langle
\nabla\mathcal L_i(\theta),\theta-\theta^*
\right\rangle
\ge
\frac{1}{L+\mu}\|\nabla\mathcal L_i(\theta)\|^2
+
\frac{\mu L}{L+\mu}\|\theta-\theta^*\|^2
\]

这个式子利用了强凸性，条件更强。带回 (1) 以后，

\[
\begin{aligned}
\|\theta_m-\theta^*\|^2
&\le
\|\theta_{m-1}-\theta^*\|^2\\
&\quad
-2\gamma\left(
\frac{1}{L+\mu}
\|\nabla\mathcal L_{s_m}(\theta_{m-1})\|^2
+
\frac{\mu L}{L+\mu}
\|\theta_{m-1}-\theta^*\|^2
\right)\\
&\quad
+\gamma^2
\|\nabla\mathcal L_{s_m}(\theta_{m-1})\|^2.
\end{aligned}
\]

合并同类项：

\[
\begin{aligned}
\|\theta_m-\theta^*\|^2
\le&
\left(
1-\frac{2\gamma\mu L}{L+\mu}
\right)
\|\theta_{m-1}-\theta^*\|^2\\
&+
\left(
\gamma^2-\frac{2\gamma}{L+\mu}
\right)
\|\nabla\mathcal L_{s_m}(\theta_{m-1})\|^2.
\end{aligned}
\tag{90}
\]

当 $0<\gamma\le \frac{2}{L+\mu}$ 时最后一项是非正的。为了得到一个上界，可以直接舍去这一项：

\[
\|\theta_m-\theta^*\|^2
\le
\left(
1-\frac{2\gamma\mu L}{L+\mu}
\right)
\|\theta_{m-1}-\theta^*\|^2
\]

取期望并递推便得到
\[
\boxed{
\mathbb E\!\left[\|\theta_T-\theta^*\|^2\right]
\le
\left(
1-\frac{2\gamma\mu L}{L+\mu}
\right)^T
\|\theta_0-\theta^*\|^2
}.
\tag{93}
\]

选择最佳学习率就得到了后面的部分。

整个证明，主要是展开一次梯度更新后的平方距离，然后用 \(L\)-光滑性和 \(\mu\)-强凸性证明关键不等式

\[
\langle\nabla\mathcal L_i(\theta),\theta-\theta^*\rangle
\ge
\frac{\|\nabla\mathcal L_i(\theta)\|^2}{L+\mu}
+
\frac{\mu L}{L+\mu}\|\theta-\theta^*\|^2;
\]
之后在恰当学习率下舍去梯度范数项即可。

证明中，**所有任务具有共同最优点** $\theta^*$ 是关键条件。它使得，随机抽到任何任务时，都能得到同一个相对于 \(\theta^*\) 的收缩不等式。

---

设 \(\theta\) 是满足
$$
\nabla \mathcal{L}_{\mathrm{train}}(\theta)
=
\frac{1}{K}\sum_{k=1}^{K}\nabla \mathcal{L}_k(\theta)
=
\mathbf{0}
$$

的收敛参数。令

$$
\mathcal{S}_k
=
\left\{
\vartheta
\;\middle|\;
\exists \epsilon>0,\ \forall \vartheta'\in B_\epsilon(\vartheta),\
\mathcal{L}_k(\vartheta)\leq \mathcal{L}_k(\vartheta')
\right\}
$$

表示任务 \(k\) 的局部最小值点集合，并令

$$
\theta_k^*
=
\underset{\vartheta\in\mathcal{S}_k}{\arg\min}
\|\vartheta-\theta\|_2.
$$

进一步定义

$$
\lambda_{\min}
=
\min_k\ 
\inf_{\xi\in[0,\theta_k^*]}
\left(
\frac{(\theta-\theta_k^*)^\top}
{\|\theta-\theta_k^*\|_2}
\nabla^2\mathcal{L}_k(\xi)
\frac{\theta-\theta_k^*}
{\|\theta-\theta_k^*\|_2}
\right)
>0,
$$

以及

$$
G=\sup_k\|\nabla\mathcal{L}_k(\theta)\|_2.
$$

那么，各任务最小值点之间的 closeness 满足如下界：

$$
\frac{1}{K}
\sum_{k=1}^{K}
\|\theta-\theta_k^*\|_2^2
\leq
\frac{1}{K\lambda_{\min}^2}
\sum_{i\neq j}
\left(
-\nabla\mathcal{L}_i(\theta)^\top
\nabla\mathcal{L}_j(\theta)
\right)
\leq
\frac{G^2}{K\lambda_{\min}^2}
\sum_{i\neq j}
\left(
1-
\operatorname{CosSim}
\left(
\nabla\mathcal{L}_i(\theta),
\nabla\mathcal{L}_j(\theta)
\right)
\right).
$$

也就是说，当不同任务的梯度方向越相似时，各任务局部最小值点与参数 \(\theta\) 之间的距离就越小。

> 梯度方向的余弦相似度是 closeness 的上界。

将中值定理应用于向量值函数 \(\vartheta\mapsto\nabla\mathcal{L}_k(\vartheta)\)，则在线段 \(\theta_k^*\) 与 \(\theta\) 之间存在一点 \(\xi_k\)，使得

\[
\nabla\mathcal{L}_k(\theta)
-
\nabla\mathcal{L}_k(\theta_k^*)
=
\nabla^2\mathcal{L}_k(\xi_k)
(\theta-\theta_k^*).
\]

由于 \(\theta_k^*\) 是一个最小值点，代入 \(\nabla\mathcal{L}_k(\theta_k^*)=\mathbf{0}\) 并取范数，可得

\[
\|\nabla\mathcal{L}_k(\theta)\|_2
=
\left\|
\nabla^2\mathcal{L}_k(\xi_k)
(\theta-\theta_k^*)
\right\|_2.
\]

由定理的假设，沿位移向量方向，Hessian 的最小特征值有一个大于 \(0\) 的下界 \(\lambda\)。这意味着

\[
\left\|
\nabla^2\mathcal{L}_k(\xi_k)
(\theta-\theta_k^*)
\right\|_2
\geq
\lambda
\|\theta-\theta_k^*\|_2.
\]

整理这一不等式，可以得到 closeness 的上界：

\[
\|\theta-\theta_k^*\|_2
\leq
\frac{1}{\lambda}
\|\nabla\mathcal{L}_k(\theta)\|_2.
\]

对两边平方，并在全部 \(K\) 个任务上取平均，可得：

\[
\frac{1}{K}
\sum_{k=1}^{K}
\|\theta-\theta_k^*\|_2^2
\leq
\frac{1}{K\lambda^2}
\sum_{k=1}^{K}
\|\nabla\mathcal{L}_k(\theta)\|_2^2.
\tag{1}
\]
由于 \(\theta\) 是总损失函数收敛后的参数，它满足驻点条件：

\[
\sum_{k=1}^{K}\nabla\mathcal{L}_k(\theta)=\mathbf{0}.
\]

该和式的平方范数等于零：

\[
\left\|
\sum_{k=1}^{K}\nabla\mathcal{L}_k(\theta)
\right\|_2^2
=
\sum_{k=1}^{K}
\|\nabla\mathcal{L}_k(\theta)\|_2^2
+
\sum_{i\neq j}
\nabla\mathcal{L}_i(\theta)^\top
\nabla\mathcal{L}_j(\theta)
=
0.
\]

通过移项，可以将梯度范数平方和与跨任务内积的负和联系起来：

\[
\sum_{k=1}^{K}
\|\nabla\mathcal{L}_k(\theta)\|_2^2
=
\sum_{i\neq j}
\left(
-\nabla\mathcal{L}_i(\theta)^\top
\nabla\mathcal{L}_j(\theta)
\right).
\]

将上式代入 (1)，即可得到定理中的第一个不等式：

\[
\frac{1}{K}
\sum_{k=1}^{K}
\|\theta-\theta_k^*\|_2^2
\leq
\frac{1}{K\lambda^2}
\sum_{i\neq j}
\left(
-\nabla\mathcal{L}_i(\theta)^\top
\nabla\mathcal{L}_j(\theta)
\right).
\tag{2}
\]
对于内积，可以利用梯度范数上界

\[
G=\sup_k\|\nabla\mathcal{L}_k(\theta)\|_2
\]

来 bound 一下。首先有：

\[
\nabla\mathcal{L}_i(\theta)^\top
\nabla\mathcal{L}_j(\theta)
=
\|\nabla\mathcal{L}_i(\theta)\|_2
\|\nabla\mathcal{L}_j(\theta)\|_2
\operatorname{CosSim}
\left(
\nabla\mathcal{L}_i(\theta),
\nabla\mathcal{L}_j(\theta)
\right).
\]

注意到，因为 $\|\nabla\mathcal{L}_k(\theta)\|_2\leq G$ 且 $\operatorname{CosSim}(\cdot,\cdot)\leq 1$，对于任意 \(i,j\)，以下项均为非负：

$$
\begin{aligned}
&
\left(
G^2
-
\|\nabla\mathcal{L}_i(\theta)\|_2
\|\nabla\mathcal{L}_j(\theta)\|_2
\right)
\\
&\qquad\cdot
\left(
1-
\operatorname{CosSim}
\left(
\nabla\mathcal{L}_i(\theta),
\nabla\mathcal{L}_j(\theta)
\right)
\right)
\geq 0,
\end{aligned}
$$

将这一非负项加到负内积上，可以直接得到如下界：
\[
\begin{aligned}
-\nabla\mathcal{L}_i(\theta)^\top
\nabla\mathcal{L}_j(\theta)
={}&
-\|\nabla\mathcal{L}_i(\theta)\|_2
\|\nabla\mathcal{L}_j(\theta)\|_2
\operatorname{CosSim}
\left(
\nabla\mathcal{L}_i(\theta),
\nabla\mathcal{L}_j(\theta)
\right)
\\
\leq{}&
-\|\nabla\mathcal{L}_i(\theta)\|_2
\|\nabla\mathcal{L}_j(\theta)\|_2
\operatorname{CosSim}
\left(
\nabla\mathcal{L}_i(\theta),
\nabla\mathcal{L}_j(\theta)
\right)
\\
&+
\left(
G^2
-
\|\nabla\mathcal{L}_i(\theta)\|_2
\|\nabla\mathcal{L}_j(\theta)\|_2
\right)
\\
&\qquad\cdot
\left(
1-
\operatorname{CosSim}
\left(
\nabla\mathcal{L}_i(\theta),
\nabla\mathcal{L}_j(\theta)
\right)
\right)
\\
={}&
G^2
\left(
1-
\operatorname{CosSim}
\left(
\nabla\mathcal{L}_i(\theta),
\nabla\mathcal{L}_j(\theta)
\right)
\right)
\\
&-
\|\nabla\mathcal{L}_i(\theta)\|_2
\|\nabla\mathcal{L}_j(\theta)\|_2
\\
\leq{}&
G^2
\left(
1-
\operatorname{CosSim}
\left(
\nabla\mathcal{L}_i(\theta),
\nabla\mathcal{L}_j(\theta)
\right)
\right).
\end{aligned}
\]

对所有 \(i\neq j\) 求和，可得：

\[
\sum_{i\neq j}
\left(
-\nabla\mathcal{L}_i(\theta)^\top
\nabla\mathcal{L}_j(\theta)
\right)
\leq
G^2
\sum_{i\neq j}
\left(
1-
\operatorname{CosSim}
\left(
\nabla\mathcal{L}_i(\theta),
\nabla\mathcal{L}_j(\theta)
\right)
\right).
\]

将其代入 (2)，就完成了定理的证明。

---

假设存在常数 \(G_{\min},L,\rho>0\)，使得对于任意 \(t\in[1,T]\) 和 \(m\in[1,K]\)，都有：

\[
\|\nabla\mathcal{L}_i(\theta_{t,m})\|_2\geq G_{\min},
\qquad
\|\nabla^2\mathcal{L}_i(\theta)\|_2\leq L,
\qquad
\|\nabla^2\mathcal{L}_i(x)-\nabla^2\mathcal{L}_i(y)\|_2
\leq
\rho\|x-y\|_2.
\]

那么，由 Nexus 优化器的算法
\[
\begin{array}{ll}
\textbf{Require:} &
\text{Initial parameters } \theta_0,\ 
\text{losses } \{\mathcal{L}_i\}_{i=1}^{K},\
\text{total iterations } T. \\

\textbf{Require:} &
\text{Optimizers: }
\mathrm{Opt}_{\mathrm{inner}}\text{ (Normalized SGD)},\
\mathrm{Opt}_{\mathrm{outer}}\text{ (e.g., AdamW)}. \\
&
\text{Inner learning rate } \gamma. \\

1: & \textbf{for } t=1 \textbf{ to } T \textbf{ do} \\

2: & \qquad \theta_{t,0} \gets \theta_{t-1}
\qquad \text{\{Initialize inner loop\}} \\

3: & \qquad \textbf{for } m=1 \textbf{ to } K \textbf{ do} \\

4: & \qquad\qquad
\text{Sample task index }
s_m \sim \mathrm{Uniform}(\{1,\ldots,K\}) \\

5: & \qquad\qquad
g \gets \nabla \mathcal{L}_{s_m}(\theta_{t,m-1}) \\

6: & \qquad\qquad
\theta_{t,m}
\gets
\theta_{t,m-1}
-\gamma\cdot\frac{g}{\lVert g\rVert_2}
\qquad \text{\{Update inner trajectory\}} \\

7: & \qquad
\hat{g}_t \gets \theta_{t,0}-\theta_{t,K}
\qquad \text{\{Compute Nexus pseudo-gradient\}} \\

8: & \qquad
\theta_t \gets
\mathrm{Opt}_{\mathrm{outer}}(\theta_{t-1},\hat{g}_t)
\qquad \text{\{Outer-update\}} \\[4pt]

& \textbf{Return: } \theta_T
\end{array}
\]
生成的序列 \(\{\theta_t\}\) 实际上有效地最小化了如下二阶目标函数：
\[
\mathcal{J}_{2\mathrm{nd}}(\theta)
=
\gamma\sum_{i=1}^{K}\|\mathcal{L}_i(\theta)\|_2
-
\gamma^2\frac{K-1}{4K}
\sum_{i\neq j}
\operatorname{CosSim}
\left(
\nabla\mathcal{L}_i(\theta),
\nabla\mathcal{L}_j(\theta)
\right).
\]

这是因为，期望更新方向满足：

\[
\mathbb{E}[\hat{g}_t]
=
\gamma\sum_{i=1}^{K}
\frac{\nabla\mathcal{L}_i(\theta_t)}
{\|\nabla\mathcal{L}_i(\theta_t)\|_2}
-
\gamma^2\frac{K-1}{4K}
\nabla_\theta
\sum_{i\neq j}
\operatorname{CosSim}
\left(
\nabla\mathcal{L}_i,
\nabla\mathcal{L}_j
\right)
+
\mathcal{E}_{2\mathrm{nd}}.
\]

其中，近似误差满足：

\[
\|\mathcal{E}_{2\mathrm{nd}}\|_2
\leq
\frac{1}{6}
\left(
\frac{4L^2+\rho G_{\min}}
{G_{\min}^2}
\right)
K^3\gamma^3
=
\mathcal{O}(\gamma^3).
\]

也就是说，Nexus 的更新方向中包含一个与梯度余弦相似度相关的二阶项，因此该算法会倾向于最大化不同任务梯度之间的相似性。

> 前面证明了梯度的余项相似度是 closeness 的上界，而这个定理证明了 Nexus 优化器在优化这个上界。

首先定义 \(L_1\) 和 \(L_2\) 分别为归一化梯度及其雅可比矩阵的 Lipschitz 常数：

1. 归一化梯度是 \(L_1\)-Lipschitz 连续的：

\[
\left\|
\frac{\nabla\mathcal{L}_i(x)}
{\|\nabla\mathcal{L}_i(x)\|_2}
-
\frac{\nabla\mathcal{L}_i(y)}
{\|\nabla\mathcal{L}_i(y)\|_2}
\right\|_2
\leq
L_1\|x-y\|_2.
\]

2. 归一化梯度的雅可比矩阵是 \(L_2\)-Lipschitz 连续的：

\[
\|\mathcal{J}_i(x)-\mathcal{J}_i(y)\|_2
\leq
L_2\|x-y\|_2,
\]

其中

\[
\mathcal{J}_i(\theta)
=
\frac{\partial}{\partial\theta}
\left(
\frac{\nabla\mathcal{L}_i(\theta)}
{\|\nabla\mathcal{L}_i(\theta)\|_2}
\right).
\]
下面来推导 \(L_1\) 和 \(L_2\)。

根据中值定理，\(L_1\) 的上界就是雅可比矩阵 \(\mathcal{J}_i(\theta)\) 的谱范数上确界。雅可比矩阵的具体形式为：

\[
\mathcal{J}_i(\theta)
=
\frac{1}{\|\nabla\mathcal{L}_i\|_2}
\left(
I-
\frac{\nabla\mathcal{L}_i\nabla\mathcal{L}_i^\top}
{\|\nabla\mathcal{L}_i\|_2^2}
\right)
\nabla^2\mathcal{L}_i(\theta).
\]

其中，中间项是一个正交投影矩阵，其谱范数为 \(1\)（可参见谱范数的性质）。利用假设中的界，有：

\[
L_1
\leq
\sup_{\theta}\|\mathcal{J}_i(\theta)\|_2
\leq
\frac{1}{G_{\min}}\cdot 1\cdot L
=
\frac{L}{G_{\min}}.
\]

然后来推 \(L_2\)。将雅可比矩阵 \(\mathcal{J}_i(\theta)\) 分解为三个部分：标量项 \(u(\theta)\)、投影项 \(\Pi(\theta)\) 和 Hessian 项 \(H_i(\theta)\)：

\[
\mathcal{J}_i(\theta)
=
\underbrace{\|\nabla\mathcal{L}_i(\theta)\|_2^{-1}}_{u(\theta)}
\underbrace{
\left(
I-
\frac{\nabla\mathcal{L}_i\nabla\mathcal{L}_i^\top}
{\|\nabla\mathcal{L}_i\|_2^2}
\right)
}_{\Pi(\theta)}
\underbrace{\nabla^2\mathcal{L}_i(\theta)}_{H_i(\theta)}.
\]

我们应用乘积的 Lipschitz 规则。对于三个函数的乘积 \(f=abc\)，其 Lipschitz 常数满足：

\[
L_f
\leq
L_aM_bM_c
+
M_aL_bM_c
+
M_aM_bL_c,
\]

其中，\(M_{(\cdot)}\) 表示相应函数幅值的上界，\(L_{(\cdot)}\) 表示其 Lipschitz 常数。

证明：

设 \(a,b,c\) 定义在同一个度量空间上，并分别满足

\[
|a(x)-a(y)|\le L_a d(x,y),\qquad
|b(x)-b(y)|\le L_b d(x,y),\qquad
|c(x)-c(y)|\le L_c d(x,y),
\]

且

\[
M_a=\sup_x |a(x)|,\qquad
M_b=\sup_x |b(x)|,\qquad
M_c=\sup_x |c(x)|.
\]

对任意 \(x,y\)，将差值作如下分解：

\[
\begin{aligned}
f(x)-f(y)
&=a(x)b(x)c(x)-a(y)b(y)c(y)\\
&=[a(x)-a(y)]b(x)c(x)\\
&\quad+a(y)[b(x)-b(y)]c(x)\\
&\quad+a(y)b(y)[c(x)-c(y)].
\end{aligned}
\]

因此，由三角不等式，

\[
\begin{aligned}
|f(x)-f(y)|
&\le |a(x)-a(y)|\,|b(x)|\,|c(x)|\\
&\quad+|a(y)|\,|b(x)-b(y)|\,|c(x)|\\
&\quad+|a(y)|\,|b(y)|\,|c(x)-c(y)|\\
&\le \bigl(
L_aM_bM_c
+M_aL_bM_c
+M_aM_bL_c
\bigr)d(x,y).
\end{aligned}
\]

这就证明了结论。

**标量项**
\[
u(\theta)=\|\nabla\mathcal{L}_i\|_2^{-1}.
\]

求梯度：

\[
\nabla u
=
\nabla\left((\|\nabla\mathcal{L}_i\|_2^{2})^{-\frac{1}{2}}\right)
=
-\frac{\nabla^2\mathcal{L}_i\nabla\mathcal{L}_i}
{\|\nabla\mathcal{L}_i\|_2^3}
=
-\frac{H_i\nabla\mathcal{L}_i}
{\|\nabla\mathcal{L}_i\|_2^3}.
\]

取范数可得：

\[
\|\nabla u\|_2
\leq
\frac{\|H_i\|_2\|\nabla\mathcal{L}_i\|_2}
{\|\nabla\mathcal{L}_i\|_2^3}
=
\frac{\|H_i\|_2}
{\|\nabla\mathcal{L}_i\|_2^2}.
\]

利用 \(L\) 和 \(G_{\min}\) 的界分别 bound 分子和分母，可得：

\[
L_u=\frac{L}{G_{\min}^2}.
\]
**投影项**
\[
\Pi(\theta)=I-
\frac{\nabla\mathcal{L}_i\nabla\mathcal{L}_i^\top}
{\|\nabla\mathcal{L}_i\|_2^2}
=
II^\top-\left(\frac{\nabla\mathcal{L}_i}{\|\nabla\mathcal{L}_i\|_2}\right)\left(\frac{\nabla\mathcal{L}_i}
{\|\nabla\mathcal{L}_i\|_2}\right)^\top
.
\]

对于任意单位向量 \(x,y\)，有：

\[
\|xx^\top-yy^\top\|_2
\leq
\|x-y\|_2+\|x-y\|_2
=
2\|x-y\|_2.
\]

根据链式法则，

\[
L_{\Pi}=2L_1=\frac{2L}{G_{\min}}.
\]
**Hessian 项**

根据假设，其 Lipschitz 常数为：

\[
L_H=\rho.
\]
将上述各项代入乘积规则，可得：

\[
\begin{aligned}
L_2
&\leq
L_uM_{\Pi}M_H
+
M_uL_{\Pi}M_H
+
M_uM_{\Pi}L_H
\\
&\leq
\left(\frac{L}{G_{\min}^2}\cdot 1\cdot L\right)
+
\left(\frac{1}{G_{\min}}\cdot
\frac{2L}{G_{\min}}\cdot L\right)
+
\left(\frac{1}{G_{\min}}\cdot 1\cdot\rho\right)
\\
&=
\frac{L^2}{G_{\min}^2}
+
\frac{2L^2}{G_{\min}^2}
+
\frac{\rho}{G_{\min}}.
\end{aligned}
\]

合并各项后，得到最终常数：

\[
L_2
=
\frac{3L^2+\rho G_{\min}}
{G_{\min}^2}.
\]
记内部循环的第 $m$ 步随机抽到的任务为 $s_m$，

我们的目标是以初始点 \(\theta_{t,0}\) 为中心，对平移后的参数 \(\theta_{t,m-1}\) 处的归一化梯度进行展开。令
\[
\Delta\theta_{m-1}
=
\theta_{t,m-1}-\theta_{t,0}.
\]

直接求导，得到归一化梯度的雅可比矩阵：

\[
\mathcal{J}_{s_m}(\theta)
=
\frac{\partial}{\partial\theta}
\left(
\frac{\nabla\mathcal{L}_i(\theta)}
{\|\nabla\mathcal{L}_i(\theta)\|_2}
\right)
=
\frac{1}{\|\nabla\mathcal{L}_{s_m}(\theta)\|_2}
\left(
I-
\frac{
\nabla\mathcal{L}_{s_m}(\theta)
\nabla\mathcal{L}_{s_m}(\theta)^\top
}{
\|\nabla\mathcal{L}_{s_m}(\theta)\|_2^2
}
\right)
\nabla^2\mathcal{L}_{s_m}(\theta).
\]

应用带余项的泰勒定理：
\[
\frac{
\nabla\mathcal{L}_{s_m}(\theta_{t,m-1})
}{
\|\nabla\mathcal{L}_{s_m}(\theta_{t,m-1})\|_2
}
=
\frac{
\nabla\mathcal{L}_{s_m}(\theta_{t,0})
}{
\|\nabla\mathcal{L}_{s_m}(\theta_{t,0})\|_2
}
+
\mathcal{J}_{s_m}(\theta_{t,0})
\Delta\theta_{m-1}
+
r_m.
\tag{1}
\]

其中余项为
\[
r_m
=
\int_0^1
\left[
\mathcal{J}_{s_m}(\theta_{t,0}+\tau\Delta\theta_{m-1})-\mathcal{J}_{s_m}(\theta_{t,0})
\right]
\Delta\theta_{m-1}
\,\mathrm d\tau.
\]
利用雅可比矩阵的 \(L_2\)-Lipschitz 性质，余项向量 \(r_m\) 满足
\[
\|r_m\|_2
\leq
\frac{L_2}{2}
\|\Delta\theta_{m-1}\|_2^2.
\]


位移量 \(\Delta\theta_{m-1}\) 是此前各次更新的总和：

\[
\Delta\theta_{m-1}
=
\sum_{l=1}^{m-1}
\left(\theta_{t,l}-\theta_{t,l-1}\right)
=
-\gamma
\sum_{l=1}^{m-1}
\frac{
\nabla\mathcal{L}_{s_l}(\theta_{t,l-1})
}{
\|\nabla\mathcal{L}_{s_l}(\theta_{t,l-1})\|_2
}.
\]

我们可以把归一化梯度都写成在 $\theta_{t,0}$ 处的：
\[
\Delta\theta_{m-1}
=
-\gamma
\sum_{l=1}^{m-1}
\frac{
\nabla\mathcal{L}_{s_l}(\theta_{t,0})
}{
\|\nabla\mathcal{L}_{s_l}(\theta_{t,0})\|_2
}
-
\gamma\sum_{l=1}^{m-1}
\left(
\frac{
\nabla\mathcal{L}_{s_l}(\theta_{t,l-1})
}{
\|\nabla\mathcal{L}_{s_l}(\theta_{t,l-1})\|_2
}
-
\frac{
\nabla\mathcal{L}_{s_l}(\theta_{t,0})
}{
\|\nabla\mathcal{L}_{s_l}(\theta_{t,0})\|_2
}
\right)
\]
之后利用归一化梯度的 \(L_1\)-Lipschitz 性质来近似差距：
\[
\begin{aligned}
\left\|
\frac{
\nabla\mathcal{L}_{s_l}(\theta_{t,l-1})
}{
\|\nabla\mathcal{L}_{s_l}(\theta_{t,l-1})\|_2
}
-
\frac{
\nabla\mathcal{L}_{s_l}(\theta_{t,0})
}{
\|\nabla\mathcal{L}_{s_l}(\theta_{t,0})\|_2
}
\right\|_2
&\leq
L_1\|\theta_{t,l-1}-\theta_{t,0}\|_2
\\
&=
L_1
\left\|
-\sum_{j=1}^{l-1}
\gamma
\frac{
\nabla\mathcal{L}_{s_j}(\theta_{t,j})
}{
\|\nabla\mathcal{L}_{s_j}(\theta_{t,j})\|_2
}
\right\|_2
\\
&\leq
L_1(l-1)\gamma.
\end{aligned}
\]

进而累积误差可以通过对各项误差求和来界定：

\[
\begin{aligned}
\left\|\sum_{l=1}^{m-1}
\left(
\frac{
\nabla\mathcal{L}_{s_l}(\theta_{t,l-1})
}{
\|\nabla\mathcal{L}_{s_l}(\theta_{t,l-1})\|
}
-
\frac{
\nabla\mathcal{L}_{s_l}(\theta_{t,0})
}{
\|\nabla\mathcal{L}_{s_l}(\theta_{t,0})\|_2
}
\right)\right\|_2
&\leq
\sum_{l=1}^{m-1}
L_1(l-1)\gamma
\\
&=
L_1\gamma
\frac{(m-1)(m-2)}{2}
\\
&\leq
\frac{L_1}{2}(m-1)^2\gamma.
\end{aligned}
\]

将上述 \(\Delta\theta_{m-1}\) 的表达式代回前面的泰勒展开式，得到：

\[
\frac{
\nabla\mathcal{L}_{s_m}(\theta_{t,m-1})
}{
\|\nabla\mathcal{L}_{s_m}(\theta_{t,m-1})\|_2
}
=
\frac{
\nabla\mathcal{L}_{s_m}(\theta_{t,0})
}{
\|\nabla\mathcal{L}_{s_m}(\theta_{t,0})\|_2
}
-
\gamma
\sum_{l=1}^{m-1}
\mathcal{J}_{s_m}(\theta_{t,0})
\frac{
\nabla\mathcal{L}_{s_l}(\theta_{t,0})
}{
\|\nabla\mathcal{L}_{s_l}(\theta_{t,0})\|_2
}
-
\gamma\sum_{l=1}^{m-1}
\mathcal{J}_{s_m}(\theta_{t,0})
\left(
\frac{
\nabla\mathcal{L}_{s_l}(\theta_{t,l-1})
}{
\|\nabla\mathcal{L}_{s_l}(\theta_{t,l-1})\|_2
}
-
\frac{
\nabla\mathcal{L}_{s_l}(\theta_{t,0})
}{
\|\nabla\mathcal{L}_{s_l}(\theta_{t,0})\|_2
}
\right)
+r_m
\]

记最后两项之和为累计误差 $\mathcal E_m$：
\[
\mathcal{E}_m=
-
\gamma\sum_{l=1}^{m-1}
\mathcal{J}_{s_m}(\theta_{t,0})
\left(
\frac{
\nabla\mathcal{L}_{s_l}(\theta_{t,l-1})
}{
\|\nabla\mathcal{L}_{s_l}(\theta_{t,l-1})\|_2
}
-
\frac{
\nabla\mathcal{L}_{s_l}(\theta_{t,0})
}{
\|\nabla\mathcal{L}_{s_l}(\theta_{t,0})\|_2
}
\right)
+r_m
\]
根据前面对于归一化梯度差距与 $r_m$ 的放缩可得
\[
\|\mathcal E_m\|_2
\leq
\gamma\|\mathcal{J}_{s_m}\|\cdot\frac{L_1}{2}(m-1)^2\gamma
+
\frac{L_2}{2}
\|\Delta\theta_{m-1}\|_2^2
\]
利用 $\|\mathcal{J}_{s_m}\|_2\leq L_1$ 以及归一化梯度性质

\[
\|\Delta\theta_{m-1}\|_2\leq(m-1)\gamma,
\]

可得：

\[
\|\mathcal{E}_m\|_2
\leq
\frac{L_2+L_1^2}{2}
(m-1)^2\gamma^2.
\]


总伪梯度为
\[
\hat{g}_t
=
\gamma
\sum_{m=1}^{k}
\frac{
\nabla\mathcal{L}_{s_m}(\theta_{t,m-1})
}{
\|\nabla\mathcal{L}_{s_m}(\theta_{t,m-1})\|_2
}.
\]

将步骤 2 中的结果代入，可得：

\[
\hat{g}_t
=
\gamma
\sum_{m=1}^{k}
\frac{\nabla\mathcal{L}_{s_m}}
{\|\nabla\mathcal{L}_{s_m}\|_2}
-
\gamma^2
\sum_{m=1}^{k}
\sum_{l=1}^{m-1}
\mathcal{J}_{s_m}
\frac{\nabla\mathcal{L}_{s_l}}
{\|\nabla\mathcal{L}_{s_l}\|_2}
+
\gamma
\sum_{m=1}^{k}\mathcal{E}_m.
\]

这里为简化记号，省略了参数 \(\theta_{t,0}\) 这一自变量；上述所有项均在 \(\theta_{t,0}\) 处计算，后文也是。

最后一项的总误差向量记作 $\mathcal E_{\mathrm{total}}$，可以通过求和得到上界：

\[
\begin{aligned}
\|\mathcal E_{\mathrm{total}}\|_2
=
\left\|
\gamma
\sum_{m=1}^{k}\mathcal{E}_m
\right\|_2
&\leq
\gamma
\sum_{m=1}^{k}
\frac{L_2+L_1^2}{2}
(m-1)^2\gamma^2
\\
&\leq
\frac{L_2+L_1^2}{6}
k^3\gamma^3.
\end{aligned}
\tag{2}
\]

也就是说，总误差为三阶量：

\[
\|\mathcal{E}_{\mathrm{total}}\|_2
=
\mathcal{O}(k^3\gamma^3).
\]
**线性项。** 令
\[
\mathcal{T}_{\mathrm{linear}}
=
\sum_{m=1}^{k}
\frac{\nabla\mathcal{L}_{s_m}}
{\|\nabla\mathcal{L}_{s_m}\|_2}.
\]

根据期望的线性性质，有：

\[
\mathbb{E}[\mathcal{T}_{\mathrm{linear}}]
=
k\cdot\frac{1}{k}
\sum_{i=1}^{k}
\frac{\nabla\mathcal{L}_i}
{\|\nabla\mathcal{L}_i\|_2}
=
\sum_{i=1}^{k}
\frac{\nabla\mathcal{L}_i}
{\|\nabla\mathcal{L}_i\|_2}.
\]

**交互项。** 令
\[
\mathcal{T}_{\mathrm{interact}}
=
\sum_{m=1}^{k}
\sum_{l=1}^{m-1}
\mathcal{J}_{s_m}
\frac{\nabla\mathcal{L}_{s_l}}
{\|\nabla\mathcal{L}_{s_l}\|_2}.
\]

由于 \(m>l\)，所以 \(s_m\) 和 \(s_l\) 相互独立。因此：

$$
\mathbb{E}\left[
\mathcal{J}_{s_m}
\frac{\nabla\mathcal{L}_{s_l}}
{\|\nabla\mathcal{L}_{s_l}\|_2}
\right]
=
\frac{1}{k^2}
\sum_{i=1}^{k}
\sum_{j=1}^{k}
\mathcal{J}_i
\frac{\nabla\mathcal{L}_j}
{\|\nabla\mathcal{L}_j\|_2}.
$$

对所有配对求和可得：

\[
\begin{aligned}
\mathbb{E}[\mathcal{T}_{\mathrm{interact}}]
&=
\frac{k(k-1)}{2}
\cdot
\frac{1}{k^2}
\sum_{i=1}^{k}
\sum_{j=1}^{k}
\mathcal{J}_i
\frac{\nabla\mathcal{L}_j}
{\|\nabla\mathcal{L}_j\|_2}
\\
&=
\frac{k-1}{2k}
\sum_{i,j}
\mathcal{J}_i
\frac{\nabla\mathcal{L}_j}
{\|\nabla\mathcal{L}_j\|_2}.
\end{aligned}
\]

我们将 \(\nabla S_{ij}\) 定义为任务 \(i\) 与任务 \(j\) 之间余弦相似度的梯度。具体而言：

\[
\nabla S_{ij}
=
\mathcal{J}_i
\frac{\nabla\mathcal{L}_j}
{\|\nabla\mathcal{L}_j\|_2}
+
\mathcal{J}_j
\frac{\nabla\mathcal{L}_i}
{\|\nabla\mathcal{L}_i\|_2}.
\]

注意到求和项

\[
\sum_{i,j}
\mathcal{J}_i
\frac{\nabla\mathcal{L}_j}
{\|\nabla\mathcal{L}_j\|_2}
\]

关于 \(i\) 和 \(j\) 是对称的，因此交互项的期望可以改写为：

\[
\begin{aligned}
\mathbb{E}[\mathcal{T}_{\mathrm{interact}}]
&=
\frac{k-1}{4k}
\sum_{i,j}
\left(
\mathcal{J}_i
\frac{\nabla\mathcal{L}_j}
{\|\nabla\mathcal{L}_j\|_2}
+
\mathcal{J}_j
\frac{\nabla\mathcal{L}_i}
{\|\nabla\mathcal{L}_i\|_2}
\right)
\\
&=
\frac{k-1}{4k}
\sum_{i,j}
\nabla S_{ij}(\theta_{t,0}).
\end{aligned}
\]
将线性项和交互项结合起来，Nexus 的期望更新方向为：

\[
\mathbb{E}[\hat{g}_t]
=
\gamma
\sum_{i=1}^{k}
\frac{\nabla\mathcal{L}_i(\theta_{t,0})}
{\|\nabla\mathcal{L}_i(\theta_{t,0})\|_2}
-
\gamma^2
\frac{k-1}{4k}
\sum_{i,j}
\nabla S_{ij}(\theta_{t,0})
+
\mathcal{E}_{\mathrm{total}}.
\]

式 (2) 给出了 $\mathcal E_{\mathrm{total}}$ 的范数上界，把 $L_1$ 和 $L_2$ 的结果代入，可得：

\[
\|\mathcal{E}_{\mathrm{total}}\|_2
\leq
\frac{1}{6}
\left(
\frac{\rho G_{\min}+4L^2}
{G_{\min}^2}
\right)
k^3\gamma^3.
\]

这就证明了结论。

这表明，Nexus 的更新方向先是遵循损失函数的梯度，同时包含一个相似度对齐项，隐式地优化梯度间的相似度；同时，其误差被一个有界的三次项所控制。



---

设 \{\theta_t\} 是使用学习率 \gamma 的归一化随机梯度下降（Normalized SGD）所生成的参数序列。该序列隐式地最小化如下期望联合目标函数：

$$
\mathcal{J}_{\mathrm{NSGD}}(\theta) = \mathbb{E}_{x\sim\mathcal{D}} \left[\mathcal{L}(x;\theta)\right] - \frac{\gamma}{8} \mathbb{E}_{x,x'\overset{\mathrm{i.i.d.}}{\sim}\mathcal{D}} \left[ \operatorname{CosSim} \left( \nabla\mathcal{L}(x;\theta), \nabla\mathcal{L}(x';\theta) \right) \right].
$$

其离散化误差有如下界：

$$
\frac{4}{3} \left( \frac{4L^2+\rho G_{\min}}{G_{\min}^2} \right) \gamma^3.
$$

其中，\operatorname{CosSim}(\cdot,\cdot) 表示余弦相似度，\mathcal{D} 表示数据分布，x 和 x' 是从 \mathcal{D} 中独立同分布采样得到的样本。

---







2506.22479

### HGM

\[
\sum_{t=1}^{T}\frac{g_{t,i}^2}{\sqrt t}\le 2G_\infty\lVert g_{1:T,i}\rVert_2.
\]

> 在梯度随时间 \(\frac{1}{\sqrt{t}}\) 地衰减时，其平方累积的上界是多少。

**法一**

定义
\[
x_t=\frac{g_{t,i}^2}{G_\infty^2}.
\]

由 \(|g_{t,i}|\le G_\infty\) 可知

\[
0\le x_t\le 1.
\]

同时令

\[
A=\sum_{t=1}^{T}x_t.
\]

我们只需要证明（原式两边同除 $G_\infty^2$ 即得）：

\[
\sum_{t=1}^{T}\frac{x_t}{\sqrt t}\le 2\sqrt A,
\qquad 0\le x_t\le1.
\]

因为权重

\[
1,\frac1{\sqrt2},\frac1{\sqrt3},\ldots
\]

是递减的，所以在总和 \(\sum_t x_t=A\) 固定时，左边要取得最大值，就应当优先把 \(x_t\) 的质量放在较小的 \(t\) 上。

设

\[
m=\lfloor A\rfloor,\qquad r=A-m\in[0,1).
\]

最大情形是

\[
x_1=\cdots=x_m=1,\qquad x_{m+1}=r,
\]

其他 \(x_t=0\)。因此

\[
\sum_{t=1}^{T}\frac{x_t}{\sqrt t}
\le
\sum_{t=1}^{m}\frac1{\sqrt t}
+
\frac r{\sqrt{m+1}}.
\]

利用

\[
\frac1{\sqrt t}
\le
2(\sqrt t-\sqrt{t-1}),
\]

得到

\[
\sum_{t=1}^{m}\frac1{\sqrt t}
\le
2\sum_{t=1}^{m}(\sqrt t-\sqrt{t-1})
=
2\sqrt m.
\]

于是

\[
\sum_{t=1}^{T}\frac{x_t}{\sqrt t}
\le
2\sqrt m+\frac r{\sqrt{m+1}}.
\]

另一方面，

\[
2(\sqrt{m+r}-\sqrt m)
=
\frac{2r}{\sqrt{m+r}+\sqrt m}
\ge
\frac r{\sqrt{m+1}},
\]

所以

\[
2\sqrt m+\frac r{\sqrt{m+1}}
\le
2\sqrt{m+r}
=
2\sqrt A.
\]

因此

\[
\sum_{t=1}^{T}\frac{x_t}{\sqrt t}\le2\sqrt A.
\]

**法二**

$T=1$ 时：
\[
g_{1,i}^2=|g_{1,i}|^2\le G_\infty|g_{1,i}|\le 2G_\infty\lVert g_{1:1,i}\rVert_2
\]
恒成立。假设对 $T-1$ 成立，记 $a=\lVert g_{1:T,i}\rVert_2$、$b=|g_{T,i}|$，则 $\lVert g_{1:T-1,i}\rVert_2=\sqrt{a^2-b^2}$。由 
\[
\sqrt{1-x}\le 1-\frac x2,\qquad x\in[0,1]
\]
得
\[
\sqrt{a^2-b^2}\le a-\frac{b^2}{2a}
\]
于是
\[
\sum_{t=1}^{T}\frac{g_{t,i}^2}{\sqrt t}\le 2G_\infty\lVert g_{1:T-1,i}\rVert_2+\frac{b^2}{\sqrt T}\le 2G_\infty\left(a-\frac{b^2}{2a}\right)+\frac{b^2}{\sqrt T}.
\]
又
\[
a=\lVert g_{1:T,i}\rVert_2\le\sqrt T\,G_\infty
\]
故
\[
\frac{1}{\sqrt T}\le\frac{G_\infty}{a}
\]
从而
\[
\frac{b^2}{\sqrt T}\le G_\infty\frac{b^2}{a}
\]
代入即得
\[
\sum_{t=1}^{T}\frac{g_{t,i}^2}{\sqrt t}\le 2G_\infty a-G_\infty\frac{b^2}{a}+G_\infty\frac{b^2}{a}=2G_\infty a=2G_\infty\lVert g_{1:T,i}\rVert_2.
\]

---

记 $\rho=\beta_1^2/\beta_2<1$。则：
\[
\frac{\hat m_{t,i}^2}{\hat v_{t,i}}\ \le\ \frac{1}{(1-\beta_2)(1-\rho)}
\]

> 一阶矩随时间的累积上界是多少。

递推展开 \(m_{t,i}\)，得到
\[
m_{t,i}
=
\sum_{k=1}^{t}
(1-\beta_{1,k})
\left(\prod_{j=k+1}^{t}\beta_{1,j}\right)
 g_{k,i}.
\]

因此，偏差修正后的一阶矩可以写成
\[
\hat m_{t,i}
=
\sum_{k=1}^{t}q_{t,k}g_{k,i},
\]
其中
\[
q_{t,k}
:=
\frac{
(1-\beta_{1,k})
\prod_{j=k+1}^{t}\beta_{1,j}
}{
1-\prod_{j=1}^{t}\beta_{1,j}
}.
\]

先对权重 \(q_{t,k}\) 作估计。由于所有 \(\beta_{1,j}\in[0,1)\)，有
\[
\prod_{j=1}^{t}\beta_{1,j}
\le \beta_{1,k},
\]
从而
\[
1-\beta_{1,k}
\le
1-\prod_{j=1}^{t}\beta_{1,j}.
\]

于是
\[
\frac{1-\beta_{1,k}}
{1-\prod_{j=1}^{t}\beta_{1,j}}
\le 1.
\]

另一方面，由 \(\beta_{1,j}\le\beta_1\)，可得
\[
\prod_{j=k+1}^{t}\beta_{1,j}
\le
\beta_1^{\,t-k}.
\]

结合以上两个估计，得到
\[
q_{t,k}
\le
\beta_1^{\,t-k}.
\]

现在对 \(\hat m_{t,i}\) 中的每一项作分解：
\[
q_{t,k}g_{k,i}
=
\left(\beta_2^{(t-k)/2}g_{k,i}\right)
\left(q_{t,k}\beta_2^{-(t-k)/2}\right).
\]

因此，由柯西—施瓦茨不等式，
\[
\begin{aligned}
|\hat m_{t,i}|
&=
\left|
\sum_{k=1}^{t}
\left(\beta_2^{(t-k)/2}g_{k,i}\right)
\left(q_{t,k}\beta_2^{-(t-k)/2}\right)
\right|
\\[2mm]
&\le
\left(
\sum_{k=1}^{t}
\beta_2^{\,t-k}g_{k,i}^2
\right)^{1/2}
\left(
\sum_{k=1}^{t}
\frac{q_{t,k}^2}{\beta_2^{\,t-k}}
\right)^{1/2}.
\end{aligned}
\]

对于第一个因子，由二阶矩的展开式
\[
v_{t,i}
=
(1-\beta_2)
\sum_{k=1}^{t}
\beta_2^{\,t-k}g_{k,i}^2,
\]
可得
\[
\sum_{k=1}^{t}
\beta_2^{\,t-k}g_{k,i}^2
=
\frac{v_{t,i}}{1-\beta_2}.
\]

对于第二个因子，由 \(q_{t,k}\le\beta_1^{t-k}\)，有
\[
\frac{q_{t,k}^2}{\beta_2^{\,t-k}}
\le
\frac{\beta_1^{2(t-k)}}{\beta_2^{\,t-k}}
=
\left(\frac{\beta_1^2}{\beta_2}\right)^{t-k}=\rho^{\,t-k}.
\]

于是
\[
\begin{aligned}
\sum_{k=1}^{t}
\frac{q_{t,k}^2}{\beta_2^{\,t-k}}
&\le
\sum_{k=1}^{t}\rho^{\,t-k}
\\
&=
\sum_{r=0}^{t-1}\rho^r
\\
&=
\frac{1-\rho^t}{1-\rho}
\\
&\le
\frac{1}{1-\rho}.
\end{aligned}
\]

将这两个估计代入，得到
\[
|\hat m_{t,i}|
\le
\left(\frac{v_{t,i}}{1-\beta_2}\right)^{1/2}
\frac{1}{\sqrt{1-\rho}}.
\]

两边平方可得
\[
\hat m_{t,i}^2
\le
\frac{v_{t,i}}
{(1-\beta_2)(1-\rho)}.
\]

当 \(v_{t,i}>0\) 时，两边除以 \(v_{t,i}\)，得到
\[
\frac{\hat m_{t,i}^2}{v_{t,i}}
\le
\frac{1}{(1-\beta_2)(1-\rho)}.
\]

又因为
\[
\hat v_{t,i}
=
\frac{v_{t,i}}{1-\beta_2^t},
\]
所以
\[
\begin{aligned}
\frac{\hat m_{t,i}^2}{\hat v_{t,i}}
&=
(1-\beta_2^t)
\frac{\hat m_{t,i}^2}{v_{t,i}}
\\[2mm]
&\le
\frac{1-\beta_2^t}
{(1-\beta_2)(1-\rho)}
\\[2mm]
&\le
\frac{1}
{(1-\beta_2)(1-\rho)}.
\end{aligned}
\]

---

Consider the AdamW optimizer with an exponentially decaying momentum coefficient
\[
\beta_{1,t}=\beta_1\lambda^{t-1},
\qquad \lambda\in(0,1),
\]
while keeping \(\beta_2\) constant:
\[
m_t=\beta_{1,t}m_{t-1}+(1-\beta_{1,t})g_t,
\qquad
\hat{m}_t=\frac{m_t}{1-\prod_{j=1}^{t}\beta_{1,j}}.
\]
Assume that \(\beta_1,\beta_2\in[0,1)\) satisfy
\[
\gamma=\frac{\sqrt{1-\beta_1^2}}{\sqrt{1-\beta_2}}<1.
\]

Furthermore, under the decaying learning-rate schedule
\[
\eta_t=\frac{\eta}{\sqrt{t}},
\]
assume that, for each coordinate \(i\), the effective inverse step-size sequence
\[
A_{t,i}
:=
\frac{\sqrt{\hat v_{t,i}}+\epsilon}{\eta_t}
\]
is nondecreasing in \(t\).

Suppose that each cost function \(f_t:\mathbb{R}^d\to\mathbb{R}\) is convex and has bounded gradients:
\[
\|\nabla f_t(\theta)\|_2\le G,
\qquad
\|\nabla f_t(\theta)\|_\infty\le G_\infty
\qquad
\text{for all }\theta\in\mathbb{R}^d.
\]

Also assume that the domain has bounded diameter:
\[
\|\theta_m-\theta_n\|_2\le D,
\qquad
\|\theta_m-\theta_n\|_\infty\le D_\infty
\qquad
\text{for all }m,n\in\{1,\ldots,T\}.
\]

Then, for all \(T>1\), the regret of HGM is bounded by
\[
R(T)\le\frac{(G_\infty+\epsilon)D_\infty^2\sqrt T}
     {2\eta}\,d
+
\frac{2D_\infty G_\infty\beta_1}
     {(1-\beta_1)(1-\lambda)}\,d
+
\frac{\eta G_\infty\sqrt T}
     {(1-\beta_2)(1-\rho)}\,d.
\]

> 给 Regret 一个上界。

由损失函数 $f_t$ 的凸性，有
$$
f_t(\theta_t)-f_t(\theta^*)
\le
\langle g_t,\theta_t-\theta^*\rangle.
$$

因此，

$$
\begin{aligned}
R(T)
&=
\sum_{t=1}^{T}
\bigl[f_t(\theta_t)-f_t(\theta^*)\bigr]
\\[2mm]
&\le
\sum_{t=1}^{T}
\langle g_t,\theta_t-\theta^*\rangle
\\[2mm]
&=
\sum_{i=1}^{d}
\sum_{t=1}^{T}
g_{t,i}(\theta_{t,i}-\theta_i^*).
\end{aligned}
$$

令

$$
P_t
:=
\prod_{j=1}^{t}\beta_{1,j},
\qquad
c_t
:=
1-P_t.
$$

于是

$$
m_t=c_t\hat m_t.
$$

由动量递推式可得

$$
\begin{aligned}
g_t
&=
\frac{m_t-\beta_{1,t}m_{t-1}}
     {1-\beta_{1,t}}
\\[2mm]
&=
\frac{c_t}{1-\beta_{1,t}}\hat m_t
-
\frac{\beta_{1,t}}{1-\beta_{1,t}}m_{t-1}.
\end{aligned}
$$

因此，对每个坐标 $i$，都有

$$
\begin{aligned}
g_{t,i}(\theta_{t,i}-\theta_i^*)
&=
\frac{c_t}{1-\beta_{1,t}}
\hat m_{t,i}(\theta_{t,i}-\theta_i^*)
\\[2mm]
&\quad-
\frac{\beta_{1,t}}{1-\beta_{1,t}}
 m_{t-1,i}(\theta_{t,i}-\theta_i^*).
\end{aligned}
\tag{1}
$$

记

$$
d_{t,i}
:=
\theta_{t,i}-\theta_i^*.
$$

由 AdamW 更新式

$$
\theta_{t+1,i}
=
\theta_{t,i}
-
\frac{\eta_t\hat m_{t,i}}
     {\sqrt{\hat v_{t,i}}+\epsilon},
$$

平方展开可得

$$
\begin{aligned}
d_{t+1,i}^2
&=
d_{t,i}^2
-
\frac{2\eta_t\hat m_{t,i}d_{t,i}}
     {\sqrt{\hat v_{t,i}}+\epsilon}
\\[2mm]
&\quad+
\frac{\eta_t^2\hat m_{t,i}^2}
     {(\sqrt{\hat v_{t,i}}+\epsilon)^2}.
\end{aligned}
$$

移项得到

$$
\begin{aligned}
\hat m_{t,i}d_{t,i}
&=
\frac{\sqrt{\hat v_{t,i}}+\epsilon}{2\eta_t}
\bigl(d_{t,i}^2-d_{t+1,i}^2\bigr)
\\[2mm]
&\quad+
\frac{\eta_t\hat m_{t,i}^2}
     {2(\sqrt{\hat v_{t,i}}+\epsilon)}.
\end{aligned}
\tag{2}
$$

令

$$
a_{t,i}
:=
\frac{\sqrt{\hat v_{t,i}}+\epsilon}{2\eta_t}.
$$

由于 $a_{t,i}$ 关于 $t$ 单调不减，由阿贝尔求和可得（如果没有单调性质，第三行的不等号不成立）

$$
\begin{aligned}
&\sum_{t=1}^{T}
a_{t,i}\bigl(d_{t,i}^2-d_{t+1,i}^2\bigr)
\\[2mm]
&\quad=
a_{1,i}d_{1,i}^2
+
\sum_{t=2}^{T}
(a_{t,i}-a_{t-1,i})d_{t,i}^2
-
a_{T,i}d_{T+1,i}^2
\\[2mm]
&\quad\le
D_\infty^2
\left[
a_{1,i}
+
\sum_{t=2}^{T}(a_{t,i}-a_{t-1,i})
\right]
\\[2mm]
&\quad=
D_\infty^2a_{T,i}.
\end{aligned}
$$

由于

$$
\frac{1}{\eta_t}
=
\frac{\sqrt t}{\eta},\qquad \sqrt{\hat v_{t,i}}
\le
G_\infty,
$$

可得

$$
a_{T,i}
\le
\frac{(G_\infty+\epsilon)\sqrt T}{2\eta}.
$$

因此

$$
\sum_{t=1}^{T}
\frac{\sqrt{\hat v_{t,i}}+\epsilon}{2\eta_t}
\bigl(d_{t,i}^2-d_{t+1,i}^2\bigr)
\le
\frac{(G_\infty+\epsilon)D_\infty^2\sqrt T}{2\eta}.
\tag{3}
$$

因为

$$
\eta_t=\frac{\eta}{\sqrt{t}},
\qquad
\frac{1}{\sqrt{\hat v_{t,i}}+\epsilon}
\le
\frac{1}{\sqrt{\hat v_{t,i}}},
$$

所以

$$
\begin{aligned}
&\sum_{t=1}^{T}
\frac{\eta_t\hat m_{t,i}^2}
     {2(\sqrt{\hat v_{t,i}}+\epsilon)}
\\[2mm]
&\quad\le
\frac{\eta}{2}
\sum_{t=1}^{T}
\frac{\hat m_{t,i}^2}
     {\sqrt t\,\sqrt{\hat v_{t,i}}}.
\end{aligned}
\tag{4}
$$

由前面已经证明的引理，有

$$
\frac{\hat m_{t,i}^2}{\hat v_{t,i}}
\le
\frac{1}{(1-\beta_2)(1-\rho)},
\qquad
\rho:=\frac{\beta_1^2}{\beta_2}<1.
$$

但是分母的次数不一致，考虑缩放 $\sqrt{\hat v_{t,i}}$. 由梯度有界性

$$
|g_{t,i}|\le G_\infty,
$$

以及偏差修正后的二阶矩是 $g_{1,i}^2,\ldots,g_{t,i}^2$ 的凸组合，可得

$$
\hat v_{t,i}\le G_\infty^2,
\qquad
\sqrt{\hat v_{t,i}}\le G_\infty.
$$

因此，

$$
\begin{aligned}
\frac{\hat m_{t,i}^2}{\sqrt{\hat v_{t,i}}}
&=
\frac{\hat m_{t,i}^2}{\hat v_{t,i}}
\sqrt{\hat v_{t,i}}
\\[2mm]
&\le
\frac{G_\infty}{(1-\beta_2)(1-\rho)}.
\end{aligned}
$$

将其代入式 (4)，得到

$$
\begin{aligned}
&\sum_{t=1}^{T}
\frac{\eta_t\hat m_{t,i}^2}
     {2(\sqrt{\hat v_{t,i}}+\epsilon)}
\\[2mm]
&\quad\le
\frac{\eta}{2}
\sum_{t=1}^{T}
\frac{\hat m_{t,i}^2}
     {\sqrt t\,\sqrt{\hat v_{t,i}}}
\\[2mm]
&\quad\le
\frac{\eta G_\infty}
     {2(1-\beta_2)(1-\rho)}
\sum_{t=1}^{T}\frac{1}{\sqrt t}
\\[2mm]
&\quad\le
\frac{\eta G_\infty\sqrt T}
     {(1-\beta_2)(1-\rho)}.
\end{aligned}
\tag{5}
$$

结合式 (2)、式 (3) 和式 (5)，可得
\[
\begin{aligned}
\sum_{t=1}^{T}\hat m_{t,i}d_{t,i}
&\le
\frac{(G_\infty+\epsilon)D_\infty^2\sqrt T}
     {2\eta}
\\[2mm]
&\quad+
\frac{\eta G_\infty\sqrt T}
     {(1-\beta_2)(1-\rho)}.
\end{aligned}
\tag{6}
\]
相当于已经给出了式 (1) 出现的
\[
\hat m_{t,i}(\theta_{t,i}-\theta_i^*)=\hat m_{t,i}d_{t,i}
\]
一个上界。考虑分解式 (1) 来处理其它项，令
\[
r_t
:=
\frac{c_t}{1-\beta_{1,t}}
=
\frac{1-P_t}{1-\beta_{1,t}}.
\]

由于
\[
P_t
=
\beta_{1,t}P_{t-1},
\]
所以
\[
\begin{align*}
r_t-1
&=
\frac{1-P_t-(1-\beta_{1,t})}
     {1-\beta_{1,t}}
\\[2mm]
&=
\frac{\beta_{1,t}-\beta_{1,t}P_{t-1}}
     {1-\beta_{1,t}}
\\[2mm]
&=
\frac{\beta_{1,t}(1-P_{t-1})}
     {1-\beta_{1,t}}.
\end{align*}
\]
因此，式 (1) 可以改写为
\[
\begin{align*}
g_{t,i}d_{t,i}
&=
r_t\hat m_{t,i}d_{t,i}
-
\frac{\beta_{1,t}}{1-\beta_{1,t}}
 m_{t-1,i}d_{t,i}
\\[2mm]
&=
\hat m_{t,i}d_{t,i}
+
(r_t-1)\hat m_{t,i}d_{t,i}
-
\frac{\beta_{1,t}}{1-\beta_{1,t}}
 m_{t-1,i}d_{t,i}.
\end{align*}
\]
也就是说，梯度内积由三部分组成：
\[
\hat m_{t,i}d_{t,i},
\qquad
(r_t-1)\hat m_{t,i}d_{t,i},
\qquad
-
\frac{\beta_{1,t}}{1-\beta_{1,t}}
 m_{t-1,i}d_{t,i}.
\]

处理第二项。由于偏差修正后的一阶矩是历史梯度的凸组合，因此

$$
|\hat m_{t,i}|\le G_\infty.
$$

又因为

$$
0\le 1-P_{t-1}\le 1,
$$

所以

$$
\begin{aligned}
r_t-1
&=
\frac{\beta_{1,t}(1-P_{t-1})}
     {1-\beta_{1,t}}
\\[2mm]
&\le
\frac{\beta_{1,t}}{1-\beta_{1,t}}.
\end{aligned}
$$

由

$$
1-\beta_{1,t}\ge1-\beta_1.
$$

由此可得

$$
\begin{aligned}
&\sum_{t=1}^{T}
(r_t-1)|\hat m_{t,i}|\,|d_{t,i}|
\\[2mm]
&\quad\le
D_\infty G_\infty
\sum_{t=1}^{T}
\frac{\beta_{1,t}}{1-\beta_{1,t}}
\\[2mm]
&\quad\le
\frac{D_\infty G_\infty\beta_1}{1-\beta_1}
\sum_{t=1}^{T}\lambda^{t-1}
\\[2mm]
&\quad\le
\frac{D_\infty G_\infty\beta_1}
     {(1-\beta_1)(1-\lambda)}.
\end{aligned}
$$

因此，

$$
\sum_{t=1}^{T}
(r_t-1)\hat m_{t,i}d_{t,i}
\le
\frac{D_\infty G_\infty\beta_1}
     {(1-\beta_1)(1-\lambda)}.
\tag{7}
$$

由于 $m_{t-1,i}$ 是历史梯度的非负加权和，并且权重之和不超过 $1$，所以

$$
|m_{t-1,i}|\le G_\infty.
$$

因此，

$$
\begin{aligned}
&\sum_{t=1}^{T}
\frac{\beta_{1,t}}{1-\beta_{1,t}}
|m_{t-1,i}|\,|d_{t,i}|
\\[2mm]
&\quad\le
D_\infty G_\infty
\sum_{t=1}^{T}
\frac{\beta_{1,t}}{1-\beta_{1,t}}
\\[2mm]
&\quad\le
\frac{D_\infty G_\infty\beta_1}
     {(1-\beta_1)(1-\lambda)}.
\end{aligned}
$$

即

$$
-
\sum_{t=1}^{T}
\frac{\beta_{1,t}}{1-\beta_{1,t}}
 m_{t-1,i}d_{t,i}
\le
\frac{D_\infty G_\infty\beta_1}
     {(1-\beta_1)(1-\lambda)}.
\tag{8}
$$

综合式 (6)、式 (7) 和式 (8)，对每个坐标 $i$，有

$$
\begin{aligned}
\sum_{t=1}^{T}g_{t,i}d_{t,i}
&\le
\frac{(G_\infty+\epsilon)D_\infty^2\sqrt T}
     {2\eta}
\\[2mm]
&\quad+
\frac{\eta G_\infty\sqrt T}
     {(1-\beta_2)(1-\rho)}
\\[2mm]
&\quad+
\frac{2D_\infty G_\infty\beta_1}
     {(1-\beta_1)(1-\lambda)}.
\end{aligned}
$$

最后，对所有坐标求和，得到

$$
\begin{aligned}
R(T)
&\le
\sum_{i=1}^{d}
\sum_{t=1}^{T}g_{t,i}d_{t,i}
\\[2mm]
&\le
\frac{(G_\infty+\epsilon)D_\infty^2\sqrt T}
     {2\eta}\,d
\\[2mm]
&\quad+
\frac{2D_\infty G_\infty\beta_1}
     {(1-\beta_1)(1-\lambda)}\,d
\\[2mm]
&\quad+
\frac{\eta G_\infty\sqrt T}
     {(1-\beta_2)(1-\rho)}\,d.
\end{aligned}
$$

这表明

$$
R(T)=O(\sqrt T).
$$

因此，

$$
\frac{R(T)}{T}
=
O\left(\frac{d}{T}\right)
\longrightarrow0.
$$







