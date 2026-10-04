# 损失函数光滑且强凸时 (S)GD 的收敛速率

> 改编自 https://arxiv.org/abs/2604.09258

# 定理

假设 loss $\mathcal{L}$ 是 $L$\-光滑的，并且是 $\mu$\-强凸的。也就是说，对于任意 $\theta_1,\theta_2$，有：

$$
\mathcal{L}(\theta_1)
\leq
\mathcal{L}(\theta_2)
+\nabla \mathcal{L}(\theta_2)^\top(\theta_1-\theta_2)
+\frac{L}{2}\|\theta_1-\theta_2\|_2^2,
$$

$$
\mathcal{L}(\theta_1)
\geq
\mathcal{L}(\theta_2)
+\nabla \mathcal{L}(\theta_2)^\top(\theta_1-\theta_2)
+\frac{\mu}{2}\|\theta_1-\theta_2\|_2^2.
$$

此外，假设存在一个最小值点 $\theta^*$，使得

$$
\nabla \mathcal{L}(\theta^*)=0.
$$

那么，以步长 $\gamma\in\left(0,\frac{2}{L+\mu}\right)$ 进行梯度下降所生成的序列 $\{\theta_0,\theta_1,\ldots,\theta_T\}$ 满足：

$$
\mathbb{E}\left[\|\theta_T-\theta^*\|_2^2\right]
\leq
\left(1-\frac{2\gamma\mu L}{L+\mu}\right)^T
\|\theta_0-\theta^*\|_2^2.
$$

特别地，如果令 $\gamma=\frac{2}{L+\mu}$，并定义条件数 $\kappa=\frac{L}{\mu}$，则可得到如下收敛速率：

$$
\mathbb{E}\left[\|\theta_T-\theta^*\|_2^2\right]
\leq
\left(\frac{\kappa-1}{\kappa+1}\right)^{2T}
\|\theta_0-\theta^*\|_2^2.
$$

> 在损失函数光滑且强凸时 (S)GD 的收敛速率。

# 定理的证明

第 $t$ 步执行

$$
\theta_t=\theta_{t-1}-\gamma \nabla \mathcal L(\theta_{t-1}).
$$

展开更新后参数与最优点之间的平方距离：

$$
\begin{aligned}
\|\theta_t-\theta^*\|^2
&=
\|\theta_{t-1}-\gamma\nabla\mathcal L(\theta_{t-1})-\theta^*\|^2\\
&=
\|\theta_{t-1}-\theta^*\|^2
-2\gamma
\left\langle
\nabla\mathcal L(\theta_{t-1}),
\theta_{t-1}-\theta^*
\right\rangle\\
&\quad
+\gamma^2\|\nabla\mathcal L(\theta_{t-1})\|^2.
\end{aligned}
\tag{1}
$$

因此，关键是给内积项

$$
\left\langle\nabla\mathcal L(\theta_{t-1}),\theta_{t-1}-\theta^*\right\rangle
$$

找一个足够强的下界。发现它与梯度的余强制性形式相似：

> 设函数 $f:\mathbb R^d\to\mathbb R$ 是凸函数，并且是 $M$\-光滑的，那么它的梯度满足
> 
> $$
> \left\langle
> \nabla f(x)-\nabla f(y),x-y
> \right\rangle
> \ge
> \frac1M
> \|\nabla f(x)-\nabla f(y)\|^2
> $$

左侧和我们要给出下界的

$$
-2\gamma \left\langle \nabla\mathcal L(\theta_{t-1}), \theta_{t-1}-\theta^* \right\rangle=-2\gamma \left\langle \nabla\mathcal L(\theta_{t-1})-\nabla\mathcal L(\theta^*), \theta_{t-1}-\theta^* \right\rangle
$$

是一样的。直接代入：

$$
-2\gamma
\left\langle
\nabla\mathcal L(\theta_{t-1})-\nabla\mathcal L(\theta^*),
\theta_{t-1}-\theta^*
\right\rangle
\le-\frac{2\gamma}{L}\|\nabla\mathcal L(\theta_{t-1})-\nabla\mathcal L(\theta^*)\|^2=-\frac{2\gamma}{L}\|\nabla\mathcal L(\theta_{t-1})\|^2
$$

再代入原式：

$$
\|\theta_t-\theta^*\|^2\le\|\theta_{t-1}-\theta^*\|^2+(\gamma-\frac{2\gamma}{L})\|\nabla\mathcal L(\theta_{t-1})\|^2
$$

这种时候，在 $\gamma\le\frac{2}{L}$ 的时候是可以收敛的，但是由于 $\|\theta_{m-1}-\theta^*\|^2$ 前面的系数是一，达不到指数的收敛速度。我们考虑应用余强制性的那个时候。余强制性要求凸并且 $M$\-光滑，而我们的 $\mathcal L$ 是 $\mu$\-强凸的，应用在仅仅要求凸的定理上就把强凸的条件浪费了。

考虑定义

$$
\phi(\theta)
=
\mathcal L(\theta)-\frac{\mu}{2}\|\theta\|^2.
$$

则 $\nabla\phi(x)=\nabla\mathcal L(x)-\mu x$，进而可以证明 $\phi$ 是凸函数：

$$
\begin{aligned}
&\phi(x)-\phi(y)-\langle\nabla\phi(y),x-y\rangle\\
={}&
\mathcal L(x)-\mathcal L(y)
-\frac{\mu}{2}\bigl(\|x\|^2-\|y\|^2\bigr)
-\left\langle\nabla\mathcal L(y)-\mu y,x-y\right\rangle\\
={}&
\mathcal L(x)-\mathcal L(y)
-\langle\nabla\mathcal L(y),x-y\rangle
-\frac{\mu}{2}
\left(
\|x\|^2-\|y\|^2-2\langle y,x-y\rangle
\right)\\
={}&
\mathcal L(x)-\mathcal L(y)
-\langle\nabla\mathcal L(y),x-y\rangle
-\frac{\mu}{2}\|x-y\|^2\ge0
\end{aligned}
$$

（事实上，如果 $\mathcal L$ 是二阶可微的，使用 $\nabla^2\phi(\theta)=\nabla^2\mathcal L(\theta)-\mu I$ 就可以直接证明）

同时，因为 $\mathcal L$ 是 $L$\-光滑的，$\phi$ 是 $(L-\mu)$\-光滑的。

考虑对这个函数应用余强制性不等式。因为

$$
\nabla\phi(\theta)
=
\nabla\mathcal L(\theta)-\mu\theta
$$

以及最优点满足

$$
\nabla\mathcal L(\theta^*)=0,
$$

所以

$$
\nabla\phi(\theta)-\nabla\phi(\theta^*)
=
\nabla\mathcal L(\theta)-\mu(\theta-\theta^*).
$$

代入前面所说的余强制性不等式，得到

$$
\begin{aligned}
&\left\langle
\nabla\mathcal L(\theta)-\mu(\theta-\theta^*),
\theta-\theta^*
\right\rangle\\
&\qquad\ge
\frac{1}{L-\mu}
\left\|
\nabla\mathcal L(\theta)-\mu(\theta-\theta^*)
\right\|^2\\
&\qquad=\frac{1}{L-\mu}(\|\nabla\mathcal L(\theta)\|^2
-2\mu\left\langle
\nabla\mathcal L(\theta),\theta-\theta^*
\right\rangle
+\mu^2\|\theta-\theta^*\|^2)
\end{aligned}
$$

整理可得

$$
\left\langle
\nabla\mathcal L(\theta),\theta-\theta^*
\right\rangle
\ge
\frac{1}{L+\mu}\|\nabla\mathcal L(\theta)\|^2
+
\frac{\mu L}{L+\mu}\|\theta-\theta^*\|^2
$$

这个式子利用了强凸性，条件更强。带回 (1) 以后，

$$
\begin{aligned}
\|\theta_t-\theta^*\|^2
&\le
\|\theta_{t-1}-\theta^*\|^2\\
&\quad
-2\gamma\left(
\frac{1}{L+\mu}
\|\nabla\mathcal L(\theta_{t-1})\|^2
+
\frac{\mu L}{L+\mu}
\|\theta_{t-1}-\theta^*\|^2
\right)\\
&\quad
+\gamma^2
\|\nabla\mathcal L(\theta_{t-1})\|^2.
\end{aligned}
$$

合并同类项：

$$
\begin{aligned}
\|\theta_t-\theta^*\|^2
\le&
\left(
1-\frac{2\gamma\mu L}{L+\mu}
\right)
\|\theta_{t-1}-\theta^*\|^2\\
&+
\left(
\gamma^2-\frac{2\gamma}{L+\mu}
\right)
\|\nabla\mathcal L(\theta_{t-1})\|^2.
\end{aligned}
$$

当 $0<\gamma\le \frac{2}{L+\mu}$ 时最后一项是非正的。为了得到一个上界，可以直接舍去这一项：

$$
\|\theta_t-\theta^*\|^2
\le
\left(
1-\frac{2\gamma\mu L}{L+\mu}
\right)
\|\theta_{t-1}-\theta^*\|^2
$$

取期望并递推便得到

$$
\mathbb E\!\left[\|\theta_T-\theta^*\|^2\right]
\le
\left(
1-\frac{2\gamma\mu L}{L+\mu}
\right)^T
\|\theta_0-\theta^*\|^2
.
$$

选择最佳学习率就得到了后面的部分。

整个证明，主要是展开一次梯度更新后的平方距离，然后用 $L$\-光滑性和 $\mu$\-强凸性证明关键不等式

$$
\langle\nabla\mathcal L(\theta),\theta-\theta^*\rangle
\ge
\frac{\|\nabla\mathcal L(\theta)\|^2}{L+\mu}
+
\frac{\mu L}{L+\mu}\|\theta-\theta^*\|^2;
$$

之后在恰当学习率下舍去梯度范数项即可。

> 封面取自
> 
> https://osu.ppy.sh/beatmapsets/2346142#osu/5045143
> 
> Halozy feat. Nanahira - Monosugoi Ikioi de Keine ga Monosugoi Uta
