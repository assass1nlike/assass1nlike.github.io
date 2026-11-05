# closeness 视角下的任务泛化能力

> 取自https://arxiv.org/abs/2604.09258

[TOC]

# 命题

## 定理 1

假设参数空间 $\mathbb{R}^d$ 被划分为一组互不相交的吸引盆 $\{\mathcal{B}\}$。在任意给定的吸引盆 $\mathcal{B}$ 内，假设从分布 $\mathcal{P}$ 中采样的任意任务 $\mathcal{L}$ 局部上都是一个二次函数：

$$
\mathcal{L}(\theta)
=
\frac{a}{2}\left\|\theta-\theta_{\mathcal{B}}^*\right\|_2^2+c_{\mathcal{B}},
$$

其中，局部任务极小值满足

$$
\theta_{\mathcal{B}}^*\sim \mathcal{P}\left(\mu_{\mathcal{B}},\sigma_{\mathcal{B}}^2\mathbf{I}\right),
$$

其均值为 $\mu_{\mathcal{B}}$，方差为 $\sigma_{\mathcal{B}}^2$；而 $c_{\mathcal{B}}$ 表示吸引盆 $\mathcal{B}$ 的内在损失（深度）。

设预训练任务 $\{\mathcal{L}_k\}_{k=1}^{K}$ 和下游任务 $\mathcal{L}_{\mathcal{T}}$ 均为从 $\mathcal{P}$ 中独立同分布采样的任务。定义

$$
\Theta
=
\left\{
\theta_{\mathrm{train},\mathcal{B}}^*
\;\middle|\;
\mathcal{L}_{\mathrm{train}}
\left(\theta_{\mathrm{train},\mathcal{B}}^*\right)
=
\frac{1}{K}\sum_{k=1}^{K}\mathcal L_{k}\left(\theta_{\mathrm{train},\mathcal{B}}^*\right)
=
C_{\mathrm{train}}
\right\}
$$

为不同吸引盆中能够达到完全相同训练损失 $C_{\mathrm{train}}$ 的收敛极小值集合。则对于任意候选解 $\theta_{\mathrm{train},\mathcal{B}}^*\in\Theta$，在一个未见过的任务 $\mathcal{T}\sim\mathcal{P}$ 上，其期望下游误差与任务方差 $\sigma_{\mathcal{B}}^2$ 严格成正比：

$$
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
$$

> 二次情形下的 closeness 结果。期望下游误差与 $\sigma_{\mathcal{B}}^2$ 成正比，说明任务极小点越接近，泛化越好。

## 定理 2

设 $\theta^*$ 是总体损失

$$
\mathbb{E}_{\mathcal{L}\sim\mathcal{P}}[\mathcal{L}(\theta)]
$$

的一个特定局部极小点。对于从 $\mathcal{P}$ 中采样的任意任务 $\mathcal{L}$，令

$$
\theta_{\mathcal{L}}^*=\arg\min_{\theta\in\mathcal{S}_{\mathcal{L}}}\|\theta^*-\theta\|_2
$$

表示与其对应的局部极小点，这里

$$
\mathcal{S}_{\mathcal{L}} = \left\{\vartheta \mid \exists\,\epsilon > 0,\ \forall\vartheta' \in B_\epsilon(\vartheta),\ \mathcal{L}_\mathcal L(\vartheta) \leq \mathcal{L}_\mathcal L(\vartheta')\right\}.
$$

是 $\mathcal L$ 的极小点集合。

假设对于任意任务 $\mathcal{L}\sim\mathcal{P}$，损失函数沿线段 $[\theta_{\mathcal{L}}^*,\theta^*]$ 在局部具有方向强凸性，即对于任意

$$
\xi\in[\theta_{\mathcal{L}}^*,\theta^*]
$$

以及任意单位向量

$$
u\in\operatorname{span}\{\theta^*-\theta_{\mathcal{L}}^*\mid\mathcal{L}\sim\mathcal{P}\},
$$

均有

$$
\lambda_{\max}\ge u^\top\nabla^2\mathcal{L}(\xi)u\ge\lambda_{\min}>0.
$$

令

$$
\mu=\mathbb{E}[\theta_{\mathcal{L}}^*],
\qquad
\sigma^2=\mathbb{E}\left[\|\theta_{\mathcal{L}}^*-\mu\|_2^2\right].
$$

假设在分布 $\mathcal{P}$ 上，任务的平坦度 $\nabla^2\mathcal{L}_{\mathcal{L}}(\xi)$ 与任务的接近程度 $\theta_{\mathcal{L}}^*$ 在统计上相互独立。在训练损失固定为 $C_{\mathrm{train}}$ 的条件下，收敛后的训练参数 $\theta_{\mathrm{train}}^*$ 的期望分布外泛化误差满足以下上界：

$$
\mathbb{E}_{\mathcal{T}\sim\mathcal{P}}\left[\mathcal{L}_{\mathcal{T}}\left(\theta_{\mathrm{train}}^*\right)\right]-C_{\mathrm{train}}
\le
\frac{\lambda_{\max}\left(\left(\frac{\lambda_{\max}}{\lambda_{\min}}\right)^2+1\right)}{2K}\sigma^2.
$$

> 非二次情形的 closeness 结果推广。只要在特定方向 $[\theta_{\mathcal{L}}^*,\theta^*]$ 上具有强凸性，就能得到类似的下游误差正比于方差的结果。

# 命题的证明

## 定理 1

由 $\theta_{\mathrm{train}}^*$ 是极小点，梯度为零：

$$
\nabla_{\theta}\mathcal{L}_{\mathrm{train}}(\theta_{\mathrm{train}}^*)
=\frac{1}{K}\sum_{k=1}^{K}a(\theta_{\mathrm{train}}^*-\theta_k^*)
=a\left(\theta_{\mathrm{train}}^*-\frac{1}{K}\sum_{k=1}^{K}\theta_k^*\right).
$$

解得

$$
\theta_{\mathrm{train}}^* = \frac{1}{K}\sum_{k=1}^{K}\theta_k^*.
$$

此最优点处的训练损失为：

$$
\mathcal{L}_{\mathrm{train}}\left(\theta_{\mathrm{train}}^*\right)
=\frac{1}{K}\sum_{k=1}^{K}\left(\frac{a}{2}\left\|\theta_{\mathrm{train}}^*-\theta_k^*\right\|_2^2+c\right)
=C_{\mathrm{train}}.
$$

由此，可以根据固定的训练损失 $C_{\mathrm{train}}$，表示吸引盆的内在损失常数 $c$（它代表极小值的“深度”）：

$$
c=C_{\mathrm{train}}-\frac{a}{2K}\sum_{k=1}^{K}\left\|\theta_{\mathrm{train}}^*-\theta_k^*\right\|_2^2.
$$

现在，考虑一个新的下游任务 $\mathcal{T}$，其极小值为 $\theta_{\mathcal{T}}^*\sim\mathcal{P}$：

$$
\mathcal{L}_{\mathcal{T}}\left(\theta_{\mathrm{train}}^*\right)
=\frac{a}{2}\left\|\theta_{\mathrm{train}}^*-\theta_{\mathcal{T}}^*\right\|_2^2+c.
$$

代入 $c$ 后，泛化差距变为：

$$
\mathcal{L}_{\mathcal{T}}\left(\theta_{\mathrm{train}}^*\right)-C_{\mathrm{train}}
=\frac{a}{2}\left(\left\|\theta_{\mathrm{train}}^*-\theta_{\mathcal{T}}^*\right\|_2^2-\frac{1}{K}\sum_{k=1}^{K}\left\|\theta_{\mathrm{train}}^*-\theta_k^*\right\|_2^2\right).
\tag{1}
$$

先计算 (1) 等号右边的第一项。

由于各个 $\theta_k^*$ 相互独立，预训练参数的协方差为

$$
\operatorname{Cov}(\theta_{\mathrm{train}}^*)
=\operatorname{Cov}\left(\frac{1}{K}\sum_{k=1}^K\theta_k^*\right)
=\frac{1}{K^2}\sum_{k=1}^K\operatorname{Cov}(\theta_k^*)
=\frac{\sigma^2}{K}I.
$$

因为 $\theta_{\mathrm{train}}^*$ 和 $\theta_{\mathcal T}^*$ 独立

$$
\operatorname{Cov}(\theta_{\mathrm{train}}^*-\theta_{\mathcal T}^*)
=\frac{\sigma^2}{K}I+\sigma^2 I
=\left(1+\frac{1}{K}\right)\sigma^2 I.
$$

预训练参数的均值为

$$
\mathbb E[\theta_{\mathrm{train}}^*]
=\frac{1}{K}\sum_{k=1}^K\mathbb E[\theta_k^*]
=\mu.
$$

所以

$$
\mathbb E\left[\theta_{\mathrm{train}}^*-\theta_{\mathcal T}^*\right]=\mu-\mu=0
$$

对于均值为零的随机向量 $Z$，有

$$
\mathbb E\left[\|Z\|_2^2\right]
=\operatorname{tr}\left(\operatorname{Cov}(Z)\right).
$$

因此

$$
\mathbb E\left[
\left\|\theta_{\mathrm{train}}^*-\theta_{\mathcal T}^*\right\|_2^2
\right]
=\left(1+\frac{1}{K}\right)\sigma^2,
$$

再计算 (1) 等号右边的第二项。

由

$$
\theta_k^*-\bar\theta^*
=(\theta_k^*-\mu)-(\bar\theta^*-\mu)
$$

平方再求和

$$
\begin{aligned}
\sum_{k=1}^K\left\|\theta_k^*-\theta_{\mathrm{train}}^*\right\|_2^2
&=
\sum_{k=1}^K\left\|\theta_k^*-\mu\right\|_2^2
+K\left\|\theta_{\mathrm{train}}^*-\mu\right\|_2^2
-2\sum_{k=1}^K(\theta_k^*-\mu)^\mathsf T(\theta_{\mathrm{train}}^*-\mu)\\
&=\sum_{k=1}^K\left\|\theta_k^*-\mu\right\|_2^2
-K\left\|\theta_{\mathrm{train}}^*-\mu\right\|_2^2
\end{aligned}
$$

两边除以 $K$，再取期望：

$$
\begin{aligned}
&\mathbb E\left[\frac{1}{K}\sum_{k=1}^K
\left\|\theta_k^*-\bar\theta^*\right\|_2^2\right] \\
&=\mathbb E\left[\frac{1}{K}\sum_{k=1}^K
\left\|\theta_k^*-\mu\right\|_2^2\right]
-\mathbb E\left[\left\|\theta_{\mathrm{train}}^*-\mu\right\|_2^2\right].
\end{aligned}
$$

独立样本均值的协方差缩小为原来的 $1/K$：

$$
E\left[\left\|\theta_{\mathrm{train}}^*-\mu\right\|_2^2\right]
=\frac{1}{K^2}\sum_{k=1}^K\mathbb E\left[\left\|\theta_k^*-\mu\right\|_2^2\right]
=\frac{1}{K}\sigma^2.
$$

因此

$$
\begin{aligned}
\mathbb E\left[\frac{1}{K}\sum_{k=1}^{K}
\left\|\theta_{\mathrm{train}}^*-\theta_k^*\right\|_2^2\right]
&=\sigma^2-\frac{1}{K}\sigma^2\\
&=\frac{K-1}{K}\sigma^2.
\end{aligned}
$$

都代入 (1) 即得

$$
\mathbb{E}\left[\mathcal{L}_{\mathcal{T}}\left(\theta_{\mathrm{train}}^*\right)\right]-C_{\mathrm{train}}
=\frac{a}{2}\left(\left(1+\frac{1}{K}\right)\sigma^2-\frac{K-1}{K}\sigma^2\right)
=\frac{a}{K}\sigma^2.
$$

这就证明了结论。

## 定理 2

由于大语言模型具有过参数化的特性，极小值点并不唯一。类似 $\mathcal{S}_{\mathcal{L}}$，首先定义期望总体损失的局部极小值集合：

$$
\mathcal{S}_{\mathcal{P}} = \left\{\vartheta \mid \exists\,\epsilon > 0,\ \forall\vartheta' \in B_\epsilon(\vartheta),\ \mathbb{E}_{\mathcal{L}_T\sim\mathcal{P}}\left[\mathcal{L}_T(\vartheta)\right] \leq \mathbb{E}_{\mathcal{L}_T\sim\mathcal{P}}\left[\mathcal{L}_T(\vartheta')\right]\right\}.
$$

令 $\theta^* \in \mathcal{S}_{\mathcal{P}}$ 为总体损失的一个特定局部极小值点。它将作为吸引域的基准点。

接下来，我们将任务特定的极小值点 $\theta_k^*$ 定义为总体极小值点 $\theta^*$ 在任务 $k$ 的局部极小值集合上的投影：

$$
\theta_k^* = \underset{\vartheta\in\mathcal{S}_k}{\arg\min}\ \|\vartheta-\theta^*\|_2,
$$

其中 $\mathcal{S}_{k} = \left\{\vartheta \mid \exists\,\epsilon > 0,\ \forall\vartheta' \in B_\epsilon(\vartheta),\ \mathcal{L}_k(\vartheta) \leq \mathcal{L}_k(\vartheta')\right\}$ 是 $k$ 的极小值集合。

给定这些任务特定极小值点 $\{\theta_k^*\}$ 的分布，我们将它们的统计中心 $\mu$ 和内在协方差 $\boldsymbol{\Sigma}$ 定义为：

$$
\mu := \mathbb{E}_{\mathcal{T}\sim\mathcal{P}}[\theta_\mathcal{T}^*],
\qquad
\boldsymbol{\Sigma} := \mathbb{E}\left[(\theta_\mathcal{T}^*-\mu)(\theta_\mathcal{T}^*-\mu)^\top\right].
$$

我们还定义标量内在方差

$$
\sigma^2 = \operatorname{Tr}(\boldsymbol{\Sigma}) = \mathbb{E}[\|\theta_k^* - \mu\|_2^2]
$$

考虑训练损失达到固定值 $C_{\mathrm{train}}$，围绕各任务极小值点进行精确的泰勒展开，可得训练损失为：

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

对任务分布取期望，可以将期望损失精确表示为：

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
\tag{2}
$$

$Q_{\mathrm{train}}$ 衡量的是收敛点 $\theta^*_{\mathrm{train}}$ 与各任务极小值点之间被 Hessian 的曲率加权的平均距离。

然后考虑从相同分布 $\mathcal{P}$ 中采样得到的下游任务 $\mathcal{T}$ 上的期望性能。我们围绕任务特定的极小值点 $\theta^*_{\mathcal{T}}$ 对测试损失进行泰勒展开。由于 $\nabla\mathcal{L}_{\mathcal{T}}(\theta^*_{\mathcal{T}})=0$，一阶项消失：

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

由式 (2)：

$$
\mathbb{E}\left[\mathcal{L}_{\mathcal{T}}\left(\theta^*_{\mathcal{T}}\right)\right]
=
\mathbb{E}\left[\mathcal{L}_k\left(\theta_k^*\right)\right]
=
C_{\mathrm{train}}-Q_{\mathrm{train}}。
$$

将其代入上式：

$$
\mathbb{E}_{\mathcal{T}}\left[\mathcal{L}_{\mathcal{T}}\left(\theta^*_{\mathrm{train}}\right)\right]
=
C_{\mathrm{train}}+\left(Q_{\mathrm{test}}-Q_{\mathrm{train}}\right)。
$$

令

$$
\bar{\mathbf{H}}=\mathbb{E}_{\mathcal{P}}[\nabla^2\mathcal{L}(\xi)]
$$

表示在任务分布上的期望 Hessian 矩阵。由于各任务独立同分布，训练任务和测试任务共享这一期望。

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
+\frac{1}{2}\operatorname{Tr}(\bar{\mathbf{H}}\boldsymbol{\Sigma})
\tag{3}
$$

对于训练项 $Q_{\mathrm{train}}$，我们考虑在训练任务上取平均后的期望二次惩罚项。根据期望的线性性，可以将 $\nabla^2\mathcal{L}_k$ 精确替换为 $\bar{\mathbf{H}}$：

$$
Q_{\mathrm{train}}
=\frac{1}{2K}\sum_{k=1}^{K}\mathbb{E}\left[(\theta^*_{\mathrm{train}}-\theta_k^*)^{\top}\bar{\mathbf{H}}(\theta^*_{\mathrm{train}}-\theta_k^*)\right].
$$

对于任意半正定矩阵 $\bar{\mathbf{H}}$，平方误差的加权和在均值 $\bar{\theta}=\frac{1}{K}\sum_{k=1}^{K}\theta_k^*$ 处取得最小值（注意在非二次情形下，不一定有 $\theta^*_{\mathrm{train}}=\bar\theta$）。因此，我们得到如下严格下界：

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

通过引入 $\mu$，我们对右侧进行矩阵形式的方差分解：

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

-   第一项为：
    

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

-   第二项（样本均值的方差）为：
    

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

将两个项相减，即计算 $Q_{\mathrm{test}}-Q_{\mathrm{train}}$ 时，主导项

$$
\frac{1}{2}\operatorname{Tr}(\bar{\mathbf{H}}\boldsymbol{\Sigma})
$$

恰好完全抵消.

随后，代入 (3) 和 $Q_{\mathrm{train}}$ 的上界，我们使用谱范数 $\lambda_{\max}$ 来约束剩余项：

$$
\begin{aligned}
\mathbb{E}_{\mathcal{T}}
\left[
\mathcal{L}_{\mathcal{T}}(\theta^*_{\mathrm{train}})
\right]
-
C_{\mathrm{train}}
={}&
Q_{\mathrm{test}}-Q_{\mathrm{train}} \\
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
\operatorname{Tr}(\boldsymbol{\Sigma}).
\end{aligned}
$$

接下来就只需要估计 $\mathbb{E}\left[ |\theta^*_{\mathrm{train}}-\mu|_2^2 \right]$.

由 $\nabla \mathcal{L}_{\mathrm{train}}\left(\theta^*_{\mathrm{train}}\right)=0$ 知

$$
\sum_{k=1}^{K}\nabla \mathcal{L}_k\left(\theta^*_{\mathrm{train}}\right)=0
$$

根据中值定理，存在 $\xi_k\in[\theta^*_{\mathrm{train}},\theta_k^*]$，使得

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

我们假设局部曲率有界：对于任意 $k$ 和向量 $\boldsymbol{u}$，都有

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

平方并取期望（注意到由于 $\mathbb{E}[\theta_k^*-\mu]=0$，交叉项会消失），并定义

$$
\kappa=\frac{\lambda_{\max}}{\lambda_{\min}}，
$$

可得

$$
\mathbb{E}\left[\left\|\theta^*_{\mathrm{train}}-\mu\right\|_2^2\right]
\leq
\frac{\kappa^2}{K}\sigma^2。
$$

因此

$$
\begin{aligned}
\mathbb{E}_{\mathcal{T}}
\left[
\mathcal{L}_{\mathcal{T}}(\theta^*_{\mathrm{train}})
\right]
-
C_{\mathrm{train}}
\leq{}&
\frac{\lambda_{\max}}{2}
\mathbb{E}\left[
\|\theta^*_{\mathrm{train}}-\mu\|_2^2
\right]
+
\frac{\lambda_{\max}}{2K}
\operatorname{Tr}(\boldsymbol{\Sigma})\\
\leq{}&
\frac{\lambda_{\max}}{2}
\left(
\frac{\kappa^2}{K}\sigma^2
\right)
+
\frac{\lambda_{\max}}{2K}\sigma^2\\
={}&
\frac{\lambda_{\max}(\kappa^2+1)}{2K}\sigma^2
\end{aligned}
$$

这表明，泛化差距的量级为

$$
O\left(\frac{\sigma^2}{K}\right),
$$

其主要由任务的内在方差以及预训练任务的数量决定。

# 背景: closeness

设预训练最终参数为

$$
\theta_{\mathrm{train}}^*\in\arg\min_\theta L_{\mathrm{train}}(\theta).
$$

对一个未知下游任务 $T$，记其局部极小点为 $\theta_{T}^*$（由于神经网络的过参数化，可能有许多局部极小点，中不任意选择一个，而是选择离当前预训练解最近的下游极小点

$$
\theta_T^*=\arg\min_{\theta\in S_T}\|\theta-\theta_{\mathrm{train}}^*\|_2.
$$

这里

$$
S_T=\left\{\theta\mid \exists\epsilon>0,\ \forall\theta'\in B_\epsilon(\theta),\ L_T(\theta)\leq L_T(\theta')\right\}.
$$

为任务 $T$ 的局部极小点集合。）

在 $\theta_T^*$ 处对下游损失作二阶 Taylor 展开。因为 $\theta_T^*$ 是局部极小点，$\nabla L_T(\theta_T^*)=0$，所以一阶项消失：

$$
\begin{aligned}
L_T(\theta_{\mathrm{train}}^*)
&=L_T(\theta_T^*)
+\frac12(\theta_{\mathrm{train}}^*-\theta_T^*)^\top
\nabla^2L_T(\theta_T^*)
(\theta_{\mathrm{train}}^*-\theta_T^*)
+O(\|\theta_{\mathrm{train}}^*-\theta_T^*\|^3)\\
&\leq L_T(\theta_T^*)
+\frac12\|\theta_{\mathrm{train}}^*-\theta_T^*\|_2^2
\max_{\xi\in[\theta_T^*,\theta_{\mathrm{train}}^*]}
\|\nabla^2L_T(\xi)\|_2.
\end{aligned}
$$

这个上界把二阶泛化差距拆成两个因子：

-   $\max_\xi\|\nabla^2L_T(\xi)\|_2$ 描述从下游极小点到预训练解这条方向上的曲率，即 flatness；
    
-   $\|\theta_{\mathrm{train}}^*-\theta_T^*\|_2^2$ 描述预训练解离下游极小点多远，称为 closeness。距离越小，closeness 越好。
    

如果这条一维方向上的损失严格是二次函数，上式成为精确等式而不只是上界。因此，在深度网络损失沿典型方向近似二次的经验前提下，flatness 和 closeness 共同概括了二阶层面的泛化信息。
